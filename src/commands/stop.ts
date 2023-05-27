import { ApplicationCommandData, CommandInteraction, CacheType, GuildMember, VoiceChannel } from "discord.js";
import { CommandHandler } from "../index";
import { SessionService } from "../session";
import { SessionLogStore } from "../sessionLogStore";

export default class StopSessionHandler implements CommandHandler {
	signature: ApplicationCommandData = {
		name: "stop",
		description: "Stops a session",
		options: [
			{
				name: "channel",
				description: "The voice channel that hosts the session to be stopped",
				type: "CHANNEL",
				required: false
			}
		]
	};

	private readonly sessionService: SessionService;
	private readonly sessionLogStore: SessionLogStore;

	constructor(sessionService: SessionService, sessionLogStore: SessionLogStore) {
		this.sessionService = sessionService;
		this.sessionLogStore = sessionLogStore;
	}

	async execute(interaction: CommandInteraction): Promise<void> {
		const executor = interaction.member as GuildMember;
		const targetChannel = (interaction.options.getChannel("channel") ?? executor.voice.channel) as VoiceChannel;
		if (interaction.guildId === null) return;
		const stopSessionResult = await this.sessionService.stopSession(interaction.guildId, targetChannel);
		if (!stopSessionResult.ok) {
			if (stopSessionResult.error === "SessionNotFound") {
				await interaction.reply(`There is no ongoing session in <#${targetChannel.id}>.`);
			}
			return;
		}
		const completedSession = stopSessionResult.value;
		const sessionLogId = await this.sessionLogStore.store(completedSession);
		if (stopSessionResult === undefined) {
			await interaction.reply(
				`Stopped the session in <#${targetChannel.id}>, but FAILED to store the session log.`
			);
			return;
		}
		await interaction.reply(`Stopped the session in <#${targetChannel.id}>, log stored with ID: ${sessionLogId}`);
	}
}
