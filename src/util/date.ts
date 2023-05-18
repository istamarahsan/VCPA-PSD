import { DateTime } from "luxon";

export interface DateTimeProvider {
	now(): DateTime
}

export function dtnow() {
	// Date Time Now UTC

	return DateTime.utc();
}