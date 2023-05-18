import { ApplicationCommandData, Client, CommandInteraction, GuildMember, Intents } from "discord.js";
import * as jsonfile from "jsonfile";
import { LazyConnectionProvider, SqliteSessionLogStore } from "./sessionLogStore";
import sqlite3 from "sqlite3";
import { ISqlite, open } from "sqlite";
import * as fs from "fs";
import { PushlogHttp } from "./pushlogTarget";
import StartSessionHandler from "./commands/start";
import { InMemoryOngoingSessionStore, SessionService } from "./session";
import * as Date from "./util/date";
import { StopSessionHandler } from "./commands/stop";

global.config = jsonfile.readFileSync("./config.json");
const dbFile = "data/session-logs.db";
const dbConfig = { filename: dbFile, driver: sqlite3.Database, mode: sqlite3.OPEN_READWRITE }

if (global.config.pushLogTarget?.type === "http-json") {
	global.pushlogTarget = new PushlogHttp(global.config.pushLogTarget.endpoint);
} else global.pushlogTarget = undefined;

export interface CommandHandler {
	signature: ApplicationCommandData;
	execute(interaction: CommandInteraction): Promise<void>;
}

const sessionService = new SessionService(new InMemoryOngoingSessionStore(), Date.utcProvider())

const commands: CommandHandler[] = [
	new StartSessionHandler(sessionService),
	new StopSessionHandler(sessionService, new SqliteSessionLogStore(new LazyConnectionProvider(dbConfig), Date.utcProvider()))
];

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_VOICE_STATES
	]
});

client.on("ready", async () => {
	if (!fs.existsSync(dbFile)) {
		fs.writeFileSync(dbFile, "");
		await performMigrations(dbConfig, "./data");
	}
	await registerCommands(client);
	global.sessionLogStore = new SqliteSessionLogStore(new LazyConnectionProvider(dbConfig));
	console.log(`>>> Logged in as ${client.user!.tag}`);
	console.log(`>>> Bonjour!`);
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;
	await handleCommand(interaction);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
	const person = newState.id;
	const oldGuild = oldState.guild.id;
	const oldChannel = oldState.channelId;
	const newGuild = newState.guild.id;
	const newChannel = newState.channelId;

	if ((oldChannel === null) && (newChannel !== null)) {
		// User was not in a voice channel, and now joined our voice channel
		await sessionService.handleJoinedChannel(person, newGuild, newChannel);
	} else if ((oldChannel !== null) && (newChannel === null)) {
		// User was in our voice channel, and now isn't in a voice channel
		await sessionService.handleLeftChannel(person, oldGuild, oldChannel);
	} else if ((oldChannel !== null) && (newChannel !== null)) {
		// User was in a different voice channel, and now is in our voice channel
		await sessionService.handleLeftChannel(person, oldGuild, oldChannel);
		await sessionService.handleJoinedChannel(person, newGuild, newChannel);
	}
})

client.login(global.config.token);

async function performMigrations(config: ISqlite.Config, migrationsPath: string) {
	const connection = await open(config);
	await connection.migrate({
		migrationsPath: migrationsPath
	});
	await connection.close();
}

async function registerCommands(client : Client) {
	global.config.serviceLocationWhiteList.forEach(async (serviceLocation) => {
		// For every guild we plan to serve
		const guild = await client.guilds.fetch(serviceLocation.guildId);

		// Start fresh
		guild.commands.set([]);

		// Add all the commands
		commands.forEach(async (command) => {
			await guild.commands.create(command.signature);
		});
	});
}

export async function handleCommand(interaction : CommandInteraction) {
	const executor = interaction.member as GuildMember;

	const executorGuild = interaction.guild;

	// Check if the command was issued from a location we service
	const requiredGuild = global.config.serviceLocationWhiteList.filter((serviceLocation) => serviceLocation.guildId === executorGuild?.id);

	if (requiredGuild.length <= 0) {
		console.log(`>>> ${executor.id} tried to issue commands from without being in a serviced guild!`);
		await interaction.reply(`<@${executor.id}> tried to issue commands without being in a serviced guild!`);
		return;
	}

	// Check if the command executor has at least one of the roles allowed to use the bot
	const executorRoles = executor.roles;
	const authorizedRoles = requiredGuild[0].commandAccessRoleIds;

	if (!executorRoles.cache.hasAny(...authorizedRoles)) {
		console.log(`>>> ${executor.id} tried to issue commands without having the appropriate permission!`);
		await interaction.reply(`<@${executor.id}> tried to issue commands without having the appropriate permission!`);
		return;
	}

	const executorCommand = interaction.command?.name;

	if (executorCommand === null) return;

	for (let i = 0; i < commands.length; i++) {
		if (executorCommand === commands[i].signature.name) {
			await commands[i].execute(interaction);
			return;
		}
	}
};