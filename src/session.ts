import { NewsChannel, Snowflake, VoiceChannel } from "discord.js";
import { DateTime } from "luxon";
import { Result, error, ok } from "./util/result";
import { DateTimeProvider } from "./util/date";
import { SessionLogStore } from "./sessionLogStore";

export type SessionLogId = Snowflake
export type SessionEvent = JoinedChannelEvent | LeftChannelEvent

export interface JoinedChannelEvent {
	type: "Join";
	userId: Snowflake;
	timeOccurred: DateTime;
}

export interface LeftChannelEvent {
	type: "Leave";
	userId: Snowflake;
	timeOccurred: DateTime;
}

export interface OngoingSession {
	ownerId: Snowflake;
	guildId: Snowflake;
	channelId: Snowflake;
	timeStarted: DateTime;
	events: SessionEvent[];
}

export interface CompletedSession extends OngoingSession {
	timeEnded: DateTime;
	events: SessionEvent[];
}

export interface SessionLog extends CompletedSession {
	id: SessionLogId;
	timeStored: DateTime;
	timePushed: DateTime | undefined;
}



export type StartSessionError = "ChannelNotVoice" | "SessionOngoing";
export type StopSessionError = "SessionNotFound";

interface OngoingSessionStore {
	has(guildId: Snowflake, channelId: Snowflake): Promise<boolean>;
	get(guildId: Snowflake, channelId: Snowflake): Promise<OngoingSession | undefined>;
	put(value: OngoingSession): Promise<void>;
}

export class SessionService {

	private readonly ongoingSessionStore: OngoingSessionStore;
	private readonly dateTimeProvider: DateTimeProvider;

	constructor(ongoingSessionStore: OngoingSessionStore, dateTimeProvider: DateTimeProvider) {
		this.ongoingSessionStore = ongoingSessionStore;
		this.dateTimeProvider = dateTimeProvider;
	}
	async handleJoinedChannel(userId: Snowflake, guildId: Snowflake, channelId: Snowflake) {
		const sessionAtChannel = await this.ongoingSessionStore.get(guildId, channelId);
		if (sessionAtChannel === undefined) return;
		sessionAtChannel.events.push({
			type: "Join",
			userId: userId,
			timeOccurred: this.dateTimeProvider.now()
		})
	}
	async handleLeftChannel(userId: Snowflake, guildId: Snowflake, channelId: Snowflake) {
		const sessionAtChannel = await this.ongoingSessionStore.get(guildId, channelId);
		if (sessionAtChannel === undefined) return;
		sessionAtChannel.events.push({
			type: "Leave",
			userId: userId,
			timeOccurred: this.dateTimeProvider.now()
		})
	}
	async getSession(guildId: Snowflake, channelId: Snowflake): Promise<OngoingSession | undefined> {
		return await this.ongoingSessionStore.get(guildId, channelId);
	}
	async startSession(ownerId: Snowflake, guildId: Snowflake, channel: VoiceChannel): Promise<Result<OngoingSession, StartSessionError>> {
		if (await this.ongoingSessionStore.has(guildId, channel.id)) {
			return error("SessionOngoing");
		}
		if (!channel.isVoice()) {
			return error("ChannelNotVoice");
		}
		const timeStarted = this.dateTimeProvider.now();
		const startJoinEvents = channel.members.map<SessionEvent>(member => ({
			type: "Join",
			userId: member.id,
			timeOccurred: timeStarted
		}));
		const newSession: OngoingSession = {
			ownerId: ownerId,
			guildId: guildId,
			channelId: channel.id,
			timeStarted: timeStarted,
			events: []
		}
		newSession.events.push(...startJoinEvents);
		await this.ongoingSessionStore.put(newSession);
		return ok(newSession);
	}
	async stopSession(guildId: Snowflake, channel: VoiceChannel): Promise<Result<CompletedSession, StopSessionError>> {
		const session = await this.ongoingSessionStore.get(guildId, channel.id);
		if (session === undefined) {
			return error("SessionNotFound");
		}
		const timeEnded = this.dateTimeProvider.now();
		const remainingLeaveEvents = channel.members.map<SessionEvent>(remainingMember => ({
			type: "Leave",
			userId: remainingMember.id,
			timeOccurred: timeEnded
		}));
		session.events.push(...remainingLeaveEvents);
		const completedSession: CompletedSession = {
			...session,
			timeEnded: timeEnded
		}
		return ok(completedSession);
	}
}

export class InMemoryOngoingSessionStore implements OngoingSessionStore {

	private map: Map<string, OngoingSession> = new Map();

	async has(guildId: string, channelId: string): Promise<boolean> {
		return this.map.has(this.composeKey(guildId, channelId));
	}
	async get(guildId: string, channelId: string): Promise<OngoingSession | undefined> {
		return this.map.get(this.composeKey(guildId, channelId));
	}
	async put(value: OngoingSession): Promise<void> {
		this.map.set(this.composeKey(value.guildId, value.channelId), value);
	}
	private composeKey(guildId: string, channelId: string): string {
		return `${guildId}-${channelId}`;
	}
}