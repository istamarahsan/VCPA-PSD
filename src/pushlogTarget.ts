import { Snowflake } from "discord.js";
import axios from "axios";
import { DateTime, Duration } from "luxon";

export type PushlogResponse = "SUCCESS" | "FAILURE"

export type AttendanceDetail = {
    discordUserId: Snowflake,
    attendanceDuration: Duration
}

export type PushlogData = {
    topicId: string,
    sessionDateTime: DateTime,
    sessionDuration: Duration,
    recorderName: string,
    mentorDiscordUserIds: Array<Snowflake>
    attendees: Array<AttendanceDetail>
}

export interface PushlogTarget {
    push(logData: PushlogData): Promise<PushlogResponse>;
}

export class PushlogHttp implements PushlogTarget {

    private readonly endpoint: string;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
    }

    public async push(logData: PushlogData): Promise<PushlogResponse> {
        const payload = JSON.stringify({
            ...logData,
            sessionDateTime: logData.sessionDateTime.toUTC().toISO(),
            sessionDuration: logData.sessionDuration.toISO(),
            attendees: logData.attendees.map((attendee) => ({
                ...attendee,
                attendanceDuration: attendee.attendanceDuration.toISO()
            }))
        });
        try {
            const response = await axios.post(this.endpoint, payload);
            return response.status === 200 ? "SUCCESS" : "FAILURE";
        } catch (error) {
            return "FAILURE";
        }
    }

}
