import { ApplicationCommandData, CommandInteraction, CacheType } from "discord.js";
import { CommandHandler } from "..";
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

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        throw new Error("Method not implemented.");
    }

}