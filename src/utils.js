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
    /** @param {import("./cli.js").App} app  */
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
        return this;
    }

    warn(message) {
        console.warn(this.generate({ level: this.Levels.WARN, message }));
        return this;
    }

    info(message) {
        console.log(this.generate({ level: this.Levels.INFO, message }));
        return this;
    }

    error(message) {
        if (message instanceof Error) message = message.message + "\n" + message.stack;
        console.error(this.generate({ level: this.Levels.ERROR, message }));
        return message instanceof Error ? message : new Error(message);
    }

    debug(message) {
        try {
            if (typeof message !== "string") message = JSON.stringify(message);
        } catch { /* empty */ }
        if (this.app.config.debug) console.log(this.generate({ level: this.Levels.DEBUG, message }));
        return this;
    }

    verbose(message) {
        if (this.app.config.verbose) console.log(this.generate({ level: this.Levels.VERBOSE, message }));
        return this;
    }

    tagless(message) {
        console.log(message);
        return this;
    }
}

export class RPM {
    static subscribers = [];
    static intervalId = null;
    static exit() {
        clearInterval(RPM.intervalId);
    }

    static tick() {
        for (const subscriber of RPM.subscribers) {
            subscriber.runNextTask();
        }
    }

    constructor(maxRPM) {
        this.interval = 60000 / maxRPM;
        this.queue = [];
        this.lastRunTimestamp = 0;
        RPM.subscribers.push(this);
        if (RPM.intervalId === null) {
            RPM.intervalId = setInterval(RPM.tick, this.interval);
        }
    }

    addTask(task, ...args) {
        this.queue.push({ task, args });
    }

    runNextTask() {
        if (this.queue.length > 0 && Date.now() - this.lastRunTimestamp >= this.interval) {
            const { task, args } = this.queue.shift();
            this.lastRunTimestamp = Date.now();
            task(...args);
        }
    }

    createTask(taskFunction, ...args) {
        return async () => {
            return new Promise(resolve => {
                this.addTask(() => {
                    const f = taskFunction(...args);
                    if (f.then) f.then(resolve);
                    else resolve(f);
                });
            });
        };
    }

    exit() {
        RPM.exit();
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
        const tasksPromises = [];
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
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenTasks));
        if (this.taskQueue.length === 0) return;
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

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function isValidUrl(string) {
    const urlRegex = /^(https?:\/\/)?((([a-z\d]([a-z\d-]*[a-z\d])*)\.)+[a-z]{2,}|((\d{1,3}\.){3}\d{1,3}))(:\d+)?(\/[-a-z\d%_.~+]*)*(\?[;&a-z\d%_.~+=-]*)?(#[-a-z\d_]*)?$/i;
    return urlRegex.test(string);
}
