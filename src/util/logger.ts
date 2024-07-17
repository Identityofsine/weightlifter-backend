export namespace Logger {
	export function log(message: string, source: string = "Logger") {
		console.log(`[${source}]: `, message);
	}
}
