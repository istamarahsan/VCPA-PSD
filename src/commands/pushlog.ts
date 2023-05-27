import { ApplicationCommandData, CommandInteraction, CacheType, GuildMember } from "discord.js";
import { CommandHandler } from "..";
import { PushlogData, PushlogTarget } from "../pushlogTarget";
import { SessionLogStore } from "../sessionLogStore";
import { SessionLog } from "../session";
import { DateTime, Duration } from "luxon";

export default class PushlogHandler implements CommandHandler {
    signature: ApplicationCommandData = {
        name: "pushlogv2",
        description: "[EXPERIMENTAL] Pushes the specified session's logs to an external archive",
        options: [
    
            {
                name: "topic-id",
                description: "Topic of the session according to the curriculum",
                type: "STRING",
                required: true
            },
    
            {
                name: "mentors",
                description: "Mentor Discord ID(s) (e.g.: \"@mentor1 @mentor2\")",
                type: "STRING",
                required: true
            },
    
            {
                name: "documentator",
                description: "Class documentator's IRL name",
                type: "STRING",
                required: true
            },
    
            {
                name: "session-id",
                description: "The ID of the session to push",
                type: "STRING",
                required: false
            }
    
    
        ]
    };

    private readonly sessionLogStore: SessionLogStore
    private readonly pushlogTarget: PushlogTarget

    constructor(sessionLogStore: SessionLogStore, pushlogTarget: PushlogTarget) {
        this.sessionLogStore = sessionLogStore;
        this.pushlogTarget = pushlogTarget;
    }

    async execute(interaction: CommandInteraction): Promise<void> {
        if (interaction.guildId === null) return;
        const idOption = interaction.options.getString("session-id");
        const logToPush = idOption != null 
            ? await this.sessionLogStore.retrieve(idOption) 
            : await this.sessionLogStore.latestUnpushed()
        if (logToPush === undefined) {
            if (idOption != null) {
                await interaction.reply(`Could not find a session log with ID '${idOption}' to push.`);
            } else {
                await interaction.reply(`Could not find a session log to push.`)
            }
            return;
        }
        const pushlogResult = await this.pushlogTarget.push(
            this.toPushData(logToPush, interaction.options.getString("topic-id")!, 
            interaction.options.getString("documentator")!, 
            interaction.options.getString("mentors")!)
            );
        if (!pushlogResult.ok) {
            await interaction.reply(`Failed to push log: "${pushlogResult.error ?? "UNKNOWN ERROR"}"`);
            return;
        }
        await interaction.reply("Successfully pushed log.");
    }

    private toPushData(sessionLog: SessionLog, topicId: string, recorderName: string, mentorDiscordUserIdsInput: string): PushlogData {
        return {
            topicId: topicId,
            sessionDateTime: sessionLog.timeStarted,
            sessionDuration: Duration.fromMillis(sessionLog.timeEnded.toMillis() - sessionLog.timeStarted.toMillis()),
            recorderName: recorderName,
            mentorDiscordUserIds: mentorDiscordUserIdsInput.split(" ").map(id => id.replace("<@", "").replace(">", "")),
            attendees: Array.from(this.arrayGroupBy(sessionLog.events, (event) => event.userId).entries()).map(([userId, events]) => {
                return {
                    discordUserId: userId,
                    attendanceDuration: Duration.fromMillis(
                        events.reduce(
                            (duration, event) => duration + ((event.timeOccurred.toMillis() - sessionLog.timeStarted.toMillis()) * (event.type === "Join" ? -1 : 1)), 0))
                }
            })
        }
    }
    private arrayGroupBy<T>(array: Array<T>, grouper: (value: T) => string): Map<string, Array<T>> {
        const result = new Map<string, Array<T>>();
        for (const value of array) {
            const key = grouper(value);
            if (!result.has(key)) {
                result.set(key, []);
            }
            result.get(key)!.push(value);
        }
        return result;
    }
}