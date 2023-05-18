import { MessageEmbed, Snowflake } from "discord.js";
import { DateTime, Duration } from "luxon";
import { Event, Session } from "./structures";

export function getRandomColor() {
	// Evenly distributed random javascript integer
	// https://stackoverflow.com/a/1527820

	return Math.floor(Math.random() * (2**24-1 - 0 + 1) + 0);
}

export function getRandomInteger(min: number, max: number) : number {
	// Evenly distributed random javascript integer
	// https://stackoverflow.com/a/1527820
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface DateTimeProvider {
	now(): DateTime
}

export function dtnow() {
	// Date Time Now UTC

	return DateTime.utc();
}

type FormatDateStyle = "VERBOSE" | "STD" | "DATE" | "TME" | "EXCEL" ;

export function formatDate(date : DateTime, style : FormatDateStyle) {
	switch (style) {
		case "VERBOSE": return date.setZone("UTC+7").toFormat("d MMMM yyyy HH:mm:ss.SSS 'UTC'Z");
		case "STD": return date.toString();
		case "DATE": return date.setZone("UTC+7").toFormat("yyyy-MM-dd");
		case "TME": return date.setZone("UTC+7").toFormat("HH:mm");
		case "EXCEL": return date.setZone("UTC+7").toFormat("yyyy-MM-dd HH:mm:ss.SSS");
	}
}

type FormatPeriodStyle = "MINUTES" | "VERBOSE";

export function formatPeriod(msecs : number, style : FormatPeriodStyle) {
	switch (style) {
		case "MINUTES": {
			return `${msecs / 1000 / 60}`;
		} break;

		case "VERBOSE": {
			const period = Duration.fromMillis(msecs);
			return period.toFormat("h 'hours,' m 'minutes,' s'.'S 'seconds");
		} break;
	}
}