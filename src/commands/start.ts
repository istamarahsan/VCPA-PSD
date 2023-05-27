import { ApplicationCommandData, CommandInteraction, GuildMember, VoiceChannel } from "discord.js";
import { CommandHandler } from "../index";
import { SessionService } from "../session";

export default class StartSessionHandler implements CommandHandler {
    signature: ApplicationCommandData = {
        name: "start",
        description: "Starts a session",
        options: [
            {
                name: "channel",
                description: "The voice channel to start the session in",
                type: "CHANNEL",
                required: false
            }
        ]
    };

    private readonly sessionService: SessionService

    constructor(sessionService: SessionService) {
        this.sessionService = sessionService;
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        const executor = interaction.member as GuildMember;
        const targetChannel = (interaction.options.getChannel("channel") ?? executor.voice.channel) as VoiceChannel;
        if (interaction.guildId === null) return;
        const startSessionResult = await this.sessionService.startSession(executor.id, interaction.guildId, targetChannel);
        if (!startSessionResult.ok) {
            if (startSessionResult.error === "ChannelNotVoice") {
                await interaction.reply("The specified channel is not a voice channel.");
            } else if (startSessionResult.error === "SessionOngoing") {
                await interaction.reply("A session is already ongoing in that channel.");
            }
            return;
        }
        const session = startSessionResult.value;
        await interaction.reply(`<@${session.ownerId}> started a session in <#${session.channelId}>`);
    }
}