import { Snowflake } from "discord.js";
import axios from "axios";
import { DateTime, Duration } from "luxon";
import { Result, error, ok } from "./util/result";

export type PushlogResponse = Result<undefined, Error | undefined>;

export type AttendanceDetail = {
	discordUserId: Snowflake;
	attendanceDuration: Duration;
};

export type PushlogData = {
	topicId: string;
	sessionDateTime: DateTime;
	sessionDuration: Duration;
	recorderName: string;
	mentorDiscordUserIds: Array<Snowflake>;
	attendees: Array<AttendanceDetail>;
};

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
			return response.status === 200
				? ok(undefined)
				: error(new Error(`HTTP Error: Response Code ${response.status}`));
		} catch (e) {
			return e instanceof Error ? error(e) : error(undefined);
		}
	}
}
