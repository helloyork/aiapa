
import * as commander from "commander";
import path, { resolve, dirname } from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import url from "url";
import dotenv from "dotenv";

import { Logger, EventEmitter } from "./utils.js";
import ui from "./ui.js";
import { resolveFromCwd } from "./api/dat.js";
import { Commands } from "./command.js";


const { program, Option } = commander;


/**
 * @typedef AppConfig
 * @property {boolean} debug debug mode
 * @property {string} apiKey api key
 * @property {string} envFile relative path to .env file
 * @property {number} maxTask maximum task
 * @property {number} maxConcurrency maximum concurrency
 * @property {number} timeOut timeout
 * @property {string} query search query
 * @property {boolean} verbose verbose mode
 * @property {boolean} headful headful mode (show browser when puppeteer-ing)
 * @property {absolutePath} output output directory
 * @property {boolean} force force mode
 * @property {relativePath} binPath relative path to bin directory
 * @property {number} maxReviews maximum reviews
 * @property {boolean} lowRam low ram mode
 * @property {string} model model that is defined in the src/dat/models.json
 * @property {boolean} proxy proxy mode
 */
/**
 * @typedef EnvConfig
 * @property {string} GEMINI_API_KEY gemini api key, can get from https://makersuite.google.com/app/apikey
 */
/**
 * @typedef {Object} ProgramDefinition
 * @property {string} name
 * @property {string} description
 * @property {string} version
 */
/**
 * @typedef {Object} OptionDefinition
 * @property {string} flags
 * @property {string} description
 * @property {any} [defaultValue]
*/
/**
 * @typedef {Object} CommandDefinition
 * @property {string} name
 * @property {string} description
 * @property {Function} [action]
 * @property {string} [scriptPath]
 * @property {OptionDefinition[]} [options]
 * @property {{[key: string]: CommandDefinition}} [children]
 * @property {commander.Command} [command]
 */
/**
 * @typedef {keyof App.Events} AppEvents
 */
/**
 * @typedef {import("./commands/get.js")|import("./commands/bin.js")|import("./commands/analyze.js")|import("./commands/bin/clean.js")|import("./commands/bin/list.js")|import("./commands/bin/whereis.js")} CommandRuntimeModule
 * @typedef {import("./api/dat.js").absolutePath} absolutePath
 * @typedef {import("./api/dat.js").relativePath} relativePath
 */
/**
 * @callback CommandRuntimeCallback
 * @param {App} app app instance
 * @param {CommandRuntimeModule} module module that is going to be executed
 */

class App {
    /* Static */
    /**
     * @param {relativePath} scriptPath 
     */
    static async loadScript(scriptPath) {
        app.Logger.verbose("Loading dynamic script: " + this.getFilePath(scriptPath));
        const module = await import(url.pathToFileURL(this.getFilePath(scriptPath)));
        return module;
    }
    /**
     * @param {relativePath} relativePath 
     * @returns {absolutePath}
     */
    static getFilePath(relativePath) {
        return resolve(dirname(url.fileURLToPath(import.meta.url)), relativePath);
    }
    static Option = Option;
    static UI = ui;
    static Commands = Commands;
    static staticConfig = {
        MAX_TRY: 128,
        USER_AGENTS_PATH: "./dat/user-agents.txt",
        DELAY_BETWEEN_TASK: 3 * 1000
    };
    static Events = {
        beforeCommandRun: "beforeCommandRun",
    };
    /**@type {AppConfig & EnvConfig} */
    static defaultConfig = {
        debug: false,
        proxy: false,
        force: false,
        lowRam: false,
        verbose: false,
        headful: false,
        query: "",
        output: "./bin",
        binPath: "../bin",
        model: "gemini-pro",
        maxTask: 10,
        maxReviews: 10,
        maxConcurrency: 5,
        timeOut: 60 * 1000,
        envFile: path.resolve(process.cwd(), ".env"),
        apiKey: process.env.GEMINI_API_KEY || "",
    };
    static exitCode = {
        OK: 0,
        ERROR: 1,
    };
    static exit(code) {
        process.exit(code);
    }

    /* Constructor */
    /**
     * Construct an App instance, or you can use the exported instance `app`
     * @constructor
     * @param {{program: import("commander").Command, inquirer: inquirer, chalk: import("chalk").ChalkInstance}} param0 
     */
    constructor({ program, inquirer, chalk }) {
        this.program = program;
        this.inquirer = inquirer;
        this.chalk = chalk;
    }

    /* Properties */
    Logger = new Logger(this);
    /**@type {AppConfig & EnvConfig} */
    config = {};
    /**@type {AppConfig} */
    userConfig = {};
    /**@type {{[key: string]: CommandDefinition}} */
    commandConfigs = {};
    isImported = false;
    events = new EventEmitter();
    mainModule;

    /* Instance */
    get App() {
        return App;
    }
    get options() {
        return this.program.opts();
    }
    get UI() {
        return this.App.UI;
    }
    /**
     * Register the program
     * @param {ProgramDefinition} param0
     * @returns {this}
     */
    registerProgram({ name, description, version }) {
        this.program
            .name(name)
            .description(description)
            .version(version);
        return this;
    }
    getCommand(parent, args) {
        if (!args || !parent || (Array.isArray(args) && !args.length)) return parent;
        let [key, ...rest] = args;
        if (parent[key]) {
            if (rest.length && parent[key].children) return this.getCommand(parent[key].children, rest);
            return parent[key];
        }
        return parent;
    }
    /**
     * Run command by name or command definition
     * @public
     * @param {string|CommandDefinition} cmd Command name, or command path, for example: "bin.clear" is as same as bin clear
     * @returns {Promise<any>}
     */
    async run(cmd) {
        if (typeof cmd === "string") {
            let cmd = this.getCommand(this.commandConfigs, cmd.split("."));
            if (!cmd) throw new Error("Command not found: " + cmd);
            return await this.runCommand(cmd.command, cmd);
        } else {
            let command = this.program.commands.find(cmd => cmd.name() === cmd.name);
            if (!command) throw new Error("Command not found: " + cmd.name);
            return await this.runCommand(command, cmd);
        }
    }
    /**
     * @param {commander.Command} command 
     * @param {CommandDefinition} config 
     * @returns {Promise<any>}
     */
    async runCommand(command, config) {
        if (!this.isImported) this.loadConfigFromArgs(command.opts());
        try {
            const module = await App.loadScript(config.scriptPath || command.name());
            this.mainModule = module;
            this.emit(App.Events.beforeCommandRun, module);
            let result = await module.default?.(app);
            if (result instanceof Error) {
                throw result;
            }
            if (config.action) config.action(result);
            return result;
        } catch (err) {
            this.Logger.error("Crashed while executing the command: " + config.name || command.name());
            this.Logger.error(err);
            this.exit(App.exitCode.ERROR);
        }
    }
    /**
     * Register a command to the program
     * @param {CommandDefinition} command 
     * @returns {this}
     */
    registerCommand(command, parent = this.program, root = {}) {
        let cmd = new commander.Command(command.name)
            .description(command.description)
            .action(async () => {
                await this.runCommand(cmd, command);
            });
        command.options?.forEach(option => {
            cmd.option(option.flags, option.description, option.defaultValue);
        });
        parent.addCommand(cmd);
        root[command.name] = { ...command, command: cmd, children: {} };
        if (command.children) this.registerCommands(command.children, cmd, root[command.name].children);
        return this;
    }
    /**
     * Register commands to the program
     * @param {{[key: string]: CommandDefinition}} commands 
     * @returns {this}
     */
    registerCommands(commands, parent = this.program, root = this.commandConfigs) {
        if (!this.commandConfigs) this.commandConfigs = {};
        Object.entries(commands).forEach(([, command]) => {
            this.registerCommand(command, parent, root);
        });
        return this;
    }
    /**
     * Register options to the program
     * @param {{[key: string]: {description: string, defaultValue: any}}} options 
     * @returns {this}
     */
    registerOptions(options) {
        Object.entries(options).forEach(([name, option]) => {
            this.program.option(name, option.description, option.defaultValue);
        });
        return this;
    }
    /**
     * Load Config from an object
     * @public
     * @param {AppConfig} obj 
     */
    setUserConfig(obj) {
        this.userConfig = obj;
        this.loadConfigFromObject(obj);
        return this;
    }
    convert(args = {}) {
        let o = {};
        Object.entries(args).forEach(([key, value]) => {
            if (typeof App.defaultConfig[key] === "number") o[key] = Number(value) || App.defaultConfig[key];
            else o[key] = value;
        });
        return o;
    }
    loadConfigFromObject(obj) {
        this.config = { ...App.defaultConfig, ...this.config, ...this.convert(obj) };
        return this;
    }
    loadConfigFromEnv() {
        let parsed = dotenv.config({ ...(this.config.envFile ? { path: resolveFromCwd(this.config.envFile) } : {}) });
        if(parsed.error) {
            this.Logger.error("Error occurred while loading .env file");
            this.crash(parsed.error);
        }
        this.config = { ...App.defaultConfig, ...this.config, ...(parsed ? parsed.parsed : {}) };
        return this;
    }
    loadConfigFromArgs(options) {
        this.config = { ...App.defaultConfig, ...this.config, ...this.convert(this.options), ...this.convert(options) };
        return this;
    }
    startIf(v) {
        if (v) this.start();
        return this;
    }
    /**
     * YOU SHOULD NOT CALL THIS METHOD IN YOUR CODE INTERFACE LAUNCHER
     * this method is only for the cli, this will parse args from cli and automatically launch the app
     * @returns {this}
     */
    start() {
        this.program.parse(process.argv);
        this.loadConfigFromArgs().loadConfigFromEnv();
        return this;
    }
    /**
     * you need to call this method after setting up, this will load configs from env and userConfig
     * @public
     * @returns {this}
     */
    load() {
        this.isImported = true;
        this.loadConfigFromObject(this.userConfig).loadConfigFromEnv();
        return this;
    }
    /**
     * @param {AppEvents} type 
     * @param  {...any} args 
     */
    emit(type, ...args) {
        this.events.emit(type, ...args);
        return this;
    }
    /**
     * @public
     * @param {AppEvents} type app event type
     * @param {CommandRuntimeCallback} listener listener
     * @example
     * app.on("beforeCommandRun", (cmd, mod) => {
     *     mod.registerDetailSelector("links", {
     *         querySelector: "a",
     *         evaluate: (el) => el.href
     *     });
     * })
     */
    on(type, listener) {
        this.events.on(type, listener);
        return this;
    }
    exit(code) {
        App.exit(code);
    }
    crash(err) {
        this.Logger.error(err);
        this.exit(App.exitCode.ERROR);
    }
}

const app = new App({ program, inquirer, chalk });

export {
    App,
    app,
};



