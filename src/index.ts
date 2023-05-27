import { ApplicationCommand, ApplicationCommandData, Client, CommandInteraction, GuildMember, Intents } from "discord.js";
import * as jsonfile from "jsonfile";
import { LazyConnectionProvider, SqliteSessionLogStore } from "./sessionLogStore";
import sqlite3 from "sqlite3";
import { ISqlite, open } from "sqlite";
import * as fs from "fs";
import { PushlogHttp } from "./pushlogTarget";
import StartSessionHandler from "./commands/start";
import StopSessionHandler from "./commands/stop";
import PushlogHandler from "./commands/pushlog";
import { InMemoryOngoingSessionStore, SessionService } from "./session";
import * as Date from "./util/date";
import { ConfigFile } from "./util/config";

const config = jsonfile.readFileSync("./config.json") as ConfigFile;
const dbFile = "data/session-logs.db";
const dbConfig = { filename: dbFile, driver: sqlite3.Database, mode: sqlite3.OPEN_READWRITE }

export interface CommandHandler {
	signature: ApplicationCommandData;
	execute(interaction: CommandInteraction): Promise<void>;
}

const sessionService = new SessionService(new InMemoryOngoingSessionStore(), Date.utcProvider());
const sessionLogStore = new SqliteSessionLogStore(new LazyConnectionProvider(dbConfig), Date.utcProvider());
const pushlogTarget = config.pushLogTarget?.type === "http-json" ? new PushlogHttp(config.pushLogTarget.endpoint) : undefined;
if (pushlogTarget === undefined) {
	throw new Error("Push log target is not defined");
}

const commands: CommandHandler[] = [
	new StartSessionHandler(sessionService),
	new StopSessionHandler(sessionService, sessionLogStore),
	new PushlogHandler(sessionLogStore, pushlogTarget)
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
	console.log(`>>> Logged in as ${client.user!.tag}`);
	console.log(`>>> Bonjour!`);
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;
	await routeCommand(interaction);
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

client.login(config.token);

async function performMigrations(config: ISqlite.Config, migrationsPath: string) {
	const connection = await open(config);
	await connection.migrate({
		migrationsPath: migrationsPath
	});
	await connection.close();
}

async function registerCommands(client : Client) {
	config.serviceLocationWhiteList.forEach(async (serviceLocation) => {
		const guild = await client.guilds.fetch(serviceLocation.guildId);
		guild.commands.set([]);
		for (const commandToCreate of commands) {
			await guild.commands.create(commandToCreate.signature);
		}
	});
}

export async function routeCommand(interaction : CommandInteraction) {
	if (!interaction.inGuild() || interaction.guild === null || interaction.guildId === null) {
		await interaction.reply(`This bot does not support non-server commands`);
		return;
	}
	const guildIsAuthorized = config.serviceLocationWhiteList
		.filter((serviceLocation) => serviceLocation.guildId === interaction.guildId)
		.length === 1;
	if (!guildIsAuthorized) {
		console.log(`>>> ${interaction.user.id} tried to issue commands from without being in a serviced guild!`);
		await interaction.reply(`<@${interaction.user.id}> tried to issue commands without being in a serviced guild!`);
		return;
	}
	const memberData = await interaction.guild.members.fetch(interaction.user.id);
	const rolesWithPermission = config.serviceLocationWhiteList
		.filter(g => g.guildId === interaction.guildId)
		.flatMap(g => g.commandAccessRoleIds);
	if (memberData.roles.cache.hasAny(...rolesWithPermission)) {
		console.log(`>>> ${interaction.user.id} tried to issue commands without having the appropriate permission!`);
		await interaction.reply(`<@${interaction.user.id}> tried to issue commands without having the appropriate permission!`);
		return;
	}
	const matchedCommand: CommandHandler | undefined = commands.filter(c => c.signature.name === interaction.commandName)[0];
	if (matchedCommand) {
		await matchedCommand.execute(interaction);
	} else {
		await interaction.reply(`Command "${interaction.commandName} not recognized"`);
	}
};