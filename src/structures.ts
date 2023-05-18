import { Snowflake, MessageEmbed } from "discord.js";
import { DateTime } from "luxon";
import * as date from "./util/date";

type ServiceLocation = {
	guildId: Snowflake;
	ioChannelId: Snowflake;
	commandAccessRoleIds: Snowflake[];
}

export type PushLogTargetConfig = PushLogTargetHttpJson

export interface PushLogTargetHttpJson {
	type: "http-json"
	endpoint: string;
}

export type ConfigFile = {
	token: Snowflake;
	serviceLocationWhiteList: ServiceLocation[];
	pushLogTarget: PushLogTargetConfig | undefined;
}

type EventType = "JOIN" | "LEAVE";

export class Event {
	type: EventType;
	uid: Snowflake;
	time: DateTime;

	constructor(type : EventType, uid: Snowflake, time: DateTime) {
		this.type = type;
		this.uid = uid;
		this.time = time;
	}
}

export class Session {
	owner: Snowflake;
	guild: Snowflake;
	channel: Snowflake;
	startTime: DateTime | undefined;
	endTime: DateTime | undefined;
	timeoutID: ReturnType<typeof setTimeout> | undefined;
	events: Event[];

	constructor(owner : Snowflake, channel : Snowflake) {
		this.owner = owner;
		this.channel = channel;
		this.startTime = undefined;
		this.endTime = undefined;
		this.events = [];
	}

	start() {
		this.startTime = date.dtnow();
	}

	end() {
		this.endTime = date.dtnow();
	}

	log(type : EventType, uid : Snowflake, time : DateTime = date.dtnow()) {
		this.events[this.events.length] = new Event(type, uid, time);
	}
}
