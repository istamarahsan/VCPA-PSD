import { DateTime } from "luxon";

export interface DateTimeProvider {
	now(): DateTime;
}

export function utcProvider(): DateTimeProvider {
	return {
		now: () => dtnow()
	};
}

export function dtnow() {
	// Date Time Now UTC

	return DateTime.utc();
}
