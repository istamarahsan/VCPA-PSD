import { Snowflake } from "discord.js";

type ServiceLocation = {
	guildId: Snowflake;
	commandAccessRoleIds: Snowflake[];
}

export type PushLogTargetConfig = PushLogTargetHttpJson

export interface PushLogTargetHttpJson {
	type: "http-json"
	endpoint: string;
}

export type ConfigFile = {
	serviceLocationWhiteList: ServiceLocation[];
	pushlogTarget: PushLogTargetConfig | undefined;
}
