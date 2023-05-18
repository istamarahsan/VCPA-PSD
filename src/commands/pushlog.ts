import { ApplicationCommandData, CommandInteraction, CacheType } from "discord.js";
import { CommandHandler } from "..";
import { PushlogTarget } from "../pushlogTarget";
import { SessionLogStore } from "../sessionLogStore";

export class PushlogHandler implements CommandHandler {
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

    async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        throw new Error("Method not implemented.");
    }

}