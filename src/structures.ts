import { Snowflake } from "discord-api-types";
import { MessageEmbed } from "discord.js";
import { DateTime } from "luxon";

import * as Util from "./util";

export type ConfigFile = {
	token: Snowflake;
	clientGuildId: Snowflake;
	clientChannelId: Snowflake;
	clientCommandAccessRoleId : Snowflake;
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
	channel: Snowflake;
	startTime: DateTime | undefined;
	endTime: DateTime | undefined;
	events: Event[];

	constructor(owner : Snowflake, channel : Snowflake) {
		this.owner = owner;
		this.channel = channel;
		this.startTime = Util.dtnow();
		this.endTime = undefined;
		this.events = [];
	}

	start() {
		this.startTime = Util.dtnow();
	}

	end() {
		this.endTime = Util.dtnow();
	}

	log(type : EventType, uid : Snowflake) {
		for (let i = 0; i < this.events.length; i++) {
			if (this.events[i] === undefined) {
				this.events[i] = new Event(type, uid, Util.dtnow());
				break;
			}
		}
	}
}

export type SessionOutput = {
	sesinfo: string,
	attdet: string,
	procdet: string,
	embed: MessageEmbed
}
