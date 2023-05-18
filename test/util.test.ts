import "ts-jest";
import * as util from "../src/util";

test("formatPeriodMinutes", () => {
	const milliSeconds = 1800000;
	const minutes = 30;
	expect(util.formatPeriod(milliSeconds, "MINUTES")).toBe(minutes.toString());
});

test("formatPeriodVerbose", () => {
	const milliSeconds = 1800000;
	const expected = "0 hours, 30 minutes, 0.0 seconds";
	expect(util.formatPeriod(milliSeconds, "VERBOSE")).toBe(expected);
});