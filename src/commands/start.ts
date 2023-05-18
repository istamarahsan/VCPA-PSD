import { ApplicationCommandData, CommandInteraction, CacheType } from "discord.js";
import { CommandHandler } from "..";
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

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        throw new Error("Method not implemented.");
    }

}