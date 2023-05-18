import { ApplicationCommandData, CommandInteraction, GuildMember, VoiceChannel } from "discord.js";

export const signature: ApplicationCommandData = {
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

export async function exec(interaction: CommandInteraction) {
	const executor = interaction.member as GuildMember;
	const argv = interaction.options;

	const targetGuildId = interaction.guildId;
	const targetChannel = (argv.getChannel("channel") ?? executor.voice.channel) as VoiceChannel;

	if (targetChannel === null) {
		console.log(`>>> Failed to stop session: ${executor.id} tried to stop a session without specifying which!`);
		await interaction.reply(`>>> Failed to stop session: <@${executor.id}> tried to stop a session without specifying which!`);
		return;
	}

	if (!targetChannel.isVoice()) {
		console.log(`>>> Failed to stop session: ${executor.id} tried to stop a session somewhere it couldn't be in anyway!`);
		await interaction.reply(`>>> Failed to stop session: <@${executor.id}> tried to stop a session somewhere it couldn't be in anyway!`);
		return;
	}

	const session = global.ongoingSessions.get(`${targetGuildId}-${targetChannel.id}`);
	if (session === undefined) {
		console.log(`>>> Failed to stop session: ${executor.id} tried to stop a non-existent session!`);
		await interaction.reply(`>>> Failed to stop session: <@${executor.id}> tried to stop a non-existent session!`);
		return;
	}

	session.end();

	const leftovers = targetChannel.members;
	leftovers.forEach((leftover) => {
		// Pretend everyone left at the same time as the session ends

		session.log("LEAVE", leftover.id, session.endTime);
	});
	
	global.lastSession = session;

	global.ongoingSessions.delete(`${targetGuildId}-${targetChannel.id}`);
}
