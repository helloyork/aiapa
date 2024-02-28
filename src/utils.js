import * as cliProgress from "cli-progress";
export { EventEmitter } from "events";

export function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

export function createProgressBar(payload = {}) {
    return new cliProgress.SingleBar({
        clearOnComplete: true,
        barCompleteChar: "=",
        barIncompleteChar: "-",
        ...payload
    }, cliProgress.Presets.shades_classic);
}

export function createMultiProgressBar(payload = {}) {
    return new cliProgress.MultiBar({
        clearOnComplete: true,
        barCompleteChar: "=",
        barIncompleteChar: "-",
        ...payload
    }, cliProgress.Presets.shades_classic);
}

export class Logger {
    /**@param {import("./cli.js").App} app  */
    constructor(app) {
        this.app = app;
        this.LevelConfig = {
            INFO: {
                color: this.app.UI.Colors.Gray,
                colorMessage: (v) => this.app.UI.hex(this.app.UI.Colors.Gray)(v),
                name: "INFO"
            },
            ERROR: {
                color: this.app.UI.Colors.Red,
                colorMessage: (v) => this.app.UI.hex(this.app.UI.Colors.Red)(v),
                name: "ERROR"
            },
            DEBUG: {
                color: this.app.UI.Colors.Navy,
                colorMessage: (v) => this.app.UI.hex(this.app.UI.Colors.Navy)(v),
                name: "DEBUG"
            },
            WARN: {
                color: this.app.UI.Colors.Yellow,
                colorMessage: (v) => this.app.UI.hex(this.app.UI.Colors.Yellow)(v),
                name: "WARN"
            },
            LOG: {
                color: this.app.UI.Colors.White,
                name: "LOG"
            },
            VERBOSE: {
                color: this.app.UI.Colors.Gray,
                colorMessage: (v) => this.app.UI.hex(this.app.UI.Colors.Gray)(v),
                name: "VERBOSE"
            },
            UNKNOWN: {
                color: this.app.UI.Colors.White,
                name: "-"
            }
        };
    }
    Levels = {
        INFO: "INFO",
        ERROR: "ERROR",
        DEBUG: "DEBUG",
        WARN: "WARN",
        LOG: "LOG",
        VERBOSE: "VERBOSE",
        UNKNOWN: "UNKNOWN"
    };
    generate({ level = this.Levels.UNKNOWN, message }) {
        return `${this.app.UI.hex(this.LevelConfig[level].color)("[" + level + "]")} ${this.LevelConfig[level]?.colorMessage?.(message) || message}`;
    }
    log(message) {
        try {
            if (typeof message !== "string") message = JSON.stringify(message);
        } catch { /* empty */ }
        console.log(this.generate({ level: this.Levels.LOG, message }));
    }
    warn(message) {
        console.warn(this.generate({ level: this.Levels.WARN, message }));
    }
    info(message) {
        console.log(this.generate({ level: this.Levels.INFO, message }));
    }
    error(message) {
        if (message instanceof Error) message = message.message + "\n" + message.stack;
        console.error(this.generate({ level: this.Levels.ERROR, message }));
    }
    debug(message) {
        try {
            if (typeof message !== "string") message = JSON.stringify(message);
        } catch { /* empty */ }
        if (this.app.config.debug) console.log(this.generate({ level: this.Levels.DEBUG, message }));
    }
    verbose(message) {
        if (this.app.config.verbose) console.log(this.generate({ level: this.Levels.VERBOSE, message }));
    }
}

export class TaskPool {
    constructor(maxConcurrent, delayBetweenTasks) {
        this.maxConcurrent = maxConcurrent;
        this.delayBetweenTasks = delayBetweenTasks;
        this.taskQueue = [];
        this.running = false;
        this.allTasksDone = null;
    }
    addTask(asyncTask) {
        this.taskQueue.push(asyncTask);
        return this;
    }
    addTasks(asyncTasks) {
        this.taskQueue.push(...asyncTasks);
        return this;
    }
    start() {
        this.running = true;
        this.allTasksDone = new Promise(resolve => this.allTasksDoneResolve = resolve);
        this.runTasks();
        return this.allTasksDone;
    }
    runTasks() {
        let tasksPromises = [];
        for (let i = 0; i < this.maxConcurrent && this.taskQueue.length > 0; i++) {
            tasksPromises.push(this.executeNextTask());
        }
        Promise.allSettled(tasksPromises).then(() => {
            if (this.taskQueue.length > 0) {
                this.runTasks();
            } else {
                this.allTasksDoneResolve();
            }
        });
    }
    async executeNextTask() {
        if (!this.running) return;
        if (this.taskQueue.length === 0) return;
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenTasks));
        const task = this.taskQueue.shift();
        return task().finally(() => {
            if (this.running && this.taskQueue.length > 0) {
                return this.executeNextTask();
            }
        });
    }
    stop() {
        this.running = false;
        return this;
    }
}

export class Rejected extends Error {
    static isRejected(r) {
        return r instanceof Rejected;
    }
    constructor(message) {
        super(message);
        this.name = "Rejected";
    }
}

export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

