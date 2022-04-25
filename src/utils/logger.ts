
export class Logger {
    static log(...args: any[]) {
        console.debug(...[`[${SCRIPT_TYPE}]`, ...args]);
    }
    static warn(...args: any[]) {
        console.warn(...[`[${SCRIPT_TYPE}]`, ...args]);
    }
    static error(...args: any[]) {
        console.error(...[`[${SCRIPT_TYPE}]`, ...args]);

    }
    static info(...args: any[]) {
        console.info( ...[`[${SCRIPT_TYPE}]`, ...args]);
    }
    static debug(...args: any[]) {
        if (DEV) {
            console.debug(...[`[${SCRIPT_TYPE}]`, ...args]);
        }
    }
}
