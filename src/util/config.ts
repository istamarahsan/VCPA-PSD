import { Snowflake } from "discord.js";

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
