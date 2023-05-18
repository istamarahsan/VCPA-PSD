import { SessionLogStore } from "../sessionLog";
import { ConfigFile, Session } from "../structures"

declare global {
	var config: ConfigFile;

	var ongoingSessions: Map<string, Session>;
	var sessionLogStore: SessionLogStore;
	var lastSession: Session;

	var pushlogTarget: PushlogTarget | undefined;
}
