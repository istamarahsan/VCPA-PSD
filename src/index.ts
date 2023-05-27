import { ApplicationCommandData, Client, CommandInteraction, Intents } from "discord.js";
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
import { loadEnv } from "./util/env";

const env = loadEnv();
if (env === undefined) {
	throw new Error("❌ Invalid environment variables");
}
if (!fs.existsSync("./config/config.json")) {
	throw new Error("❌ Config file not found in **config/config.json**");
}
const config = jsonfile.readFileSync("./config/config.json") as ConfigFile;
const dbFile = "data/session-logs.db";
const dbConfig = { filename: dbFile, driver: sqlite3.Database, mode: sqlite3.OPEN_READWRITE };

export interface CommandHandler {
	signature: ApplicationCommandData;
	execute(interaction: CommandInteraction): Promise<void>;
}

const sessionService = new SessionService(new InMemoryOngoingSessionStore(), Date.utcProvider());
const sessionLogStore = new SqliteSessionLogStore(new LazyConnectionProvider(dbConfig), Date.utcProvider());
const pushlogTarget =
	config.pushlogTarget?.type === "http-json" ? new PushlogHttp(config.pushlogTarget.endpoint) : undefined;
if (pushlogTarget === undefined) {
	throw new Error("❌ Push log target is not defined");
}

const commands: CommandHandler[] = [
	new StartSessionHandler(sessionService),
	new StopSessionHandler(sessionService, sessionLogStore),
	new PushlogHandler(sessionLogStore, pushlogTarget)
];

const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES]
});

client.on("ready", async () => {
	if (!fs.existsSync(dbFile)) {
		fs.writeFileSync(dbFile, "");
		await performMigrations(dbConfig, "./migrations");
	}
	await registerCommands(client);
	console.log(`>>> Logged in as ${client.user!.tag}`);
	console.log(`>>> Guten Tag!`);
});

client.on("interactionCreate", async (interaction) => {
	if (!interaction.isCommand()) return;
	await routeCommandAndMiddleware(interaction);
});

client.on("voiceStateUpdate", async (oldState, newState) => {
	const userId = newState.id;
	const oldGuild = oldState.guild.id;
	const oldChannel = oldState.channelId;
	const newGuild = newState.guild.id;
	const newChannel = newState.channelId;

	const hasJoinedAVoiceChannel = oldChannel === null && newChannel !== null;
	const hasLeftAVoiceChannel = oldChannel !== null && newChannel === null;
	const hasMovedVoiceChannel = oldChannel !== null && newChannel !== null;

	if (hasJoinedAVoiceChannel) {
		await sessionService.handleJoinedChannel(userId, newGuild, newChannel);
	} else if (hasLeftAVoiceChannel) {
		await sessionService.handleLeftChannel(userId, oldGuild, oldChannel);
	} else if (hasMovedVoiceChannel) {
		await sessionService.handleLeftChannel(userId, oldGuild, oldChannel);
		await sessionService.handleJoinedChannel(userId, newGuild, newChannel);
	}
});

client.login(env.BOT_TOKEN);

async function performMigrations(config: ISqlite.Config, migrationsPath: string) {
	const connection = await open(config);
	await connection.migrate({
		migrationsPath: migrationsPath
	});
	await connection.close();
}

async function registerCommands(client: Client) {
	config.serviceLocationWhiteList.forEach(async (serviceLocation) => {
		const guild = await client.guilds.fetch(serviceLocation.guildId);
		guild.commands.set([]);
		for (const commandToCreate of commands) {
			await guild.commands.create(commandToCreate.signature);
		}
	});
}

export async function routeCommandAndMiddleware(interaction: CommandInteraction) {
	if (!interaction.inGuild() || interaction.guild === null || interaction.guildId === null) {
		await interaction.reply(`This bot does not support non-server commands`);
		return;
	}
	const guildIsAuthorized =
		config.serviceLocationWhiteList.filter((serviceLocation) => serviceLocation.guildId === interaction.guildId)
			.length === 1;
	if (!guildIsAuthorized) {
		console.log(`>>> ${interaction.user.id} tried to issue commands from without being in a serviced guild!`);
		await interaction.reply(`<@${interaction.user.id}> tried to issue commands without being in a serviced guild!`);
		return;
	}
	const memberData = await interaction.guild.members.fetch(interaction.user.id);
	const rolesWithPermission = config.serviceLocationWhiteList
		.filter((g) => g.guildId === interaction.guildId)
		.flatMap((g) => g.commandAccessRoleIds);
	if (memberData.roles.cache.hasAny(...rolesWithPermission)) {
		console.log(`>>> ${interaction.user.id} tried to issue commands without having the appropriate permission!`);
		await interaction.reply(
			`<@${interaction.user.id}> tried to issue commands without having the appropriate permission!`
		);
		return;
	}
	const matchedCommand: CommandHandler | undefined = commands.filter(
		(c) => c.signature.name === interaction.commandName
	)[0];
	if (matchedCommand) {
		await matchedCommand.execute(interaction);
	} else {
		await interaction.reply(`Command "${interaction.commandName} not recognized"`);
	}
}
