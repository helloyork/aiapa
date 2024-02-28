
import * as commander from "commander";
import path, { resolve, dirname } from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import url from "url";
import dotenv from "dotenv";

import { Logger, EventEmitter } from "./utils.js";
import ui from "./ui.js";


const { program, Option } = commander;


/**
 * @typedef AppConfig
 * @property {boolean} debug
 * @property {string} apiKey
 * @property {string} envFile
 * @property {number} maxTask
 * @property {number} maxConcurrency
 * @property {number} timeOut
 * @property {string} query
 * @property {boolean} verbose
 * @property {boolean} headful
 * @property {string} output
 * @property {boolean} force
 * @property {string} binPath
 * @property {number} maxReviews
 * @property {boolean} lowRam
 */
/**
 * @typedef EnvConfig
 * @property {string} GEMINI_API_KEY
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
 * @property {{[key: string]: CommandConfig}} [children]
 * @property {commander.Command} [command]
 */
/**
 * @typedef {keyof App.Events} AppEvents
 */
/**
 * @callback GetCommand
 * @param {App} app
 * @param {import("./commands/get.js")} module
 */
class App {
    /* Static */
    static async loadScript(scriptPath) {
        app.Logger.info("Loading dynamic script: " + this.getFilePath(scriptPath));
        const module = await import(url.pathToFileURL(this.getFilePath(scriptPath)));
        return module;
    }
    static getFilePath(relativePath) {
        return resolve(dirname(url.fileURLToPath(import.meta.url)), relativePath);
    }
    static Option = Option;
    static UI = ui;
    static staticConfig = {
        MAX_TRY: 128,
    };
    static Events = {
        beforeCommandRun: "beforeCommandRun",
    };
    /**@type {AppConfig & EnvConfig} */
    static defaultConfig = {
        debug: false,
        envFile: path.resolve(process.cwd(), ".env"),
        apiKey: process.env.GEMINI_API_KEY || "",
        maxTask: 10,
        maxConcurrency: 5,
        timeOut: 60 * 1000,
        query: "",
        verbose: false,
        headful: false,
        output: "./bin",
        force: false,
        binPath: "../bin",
        maxReviews: 10,
        lowRam: false,
    };

    /* Constructor */
    /**
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
     * Run command by name
     * @param {string|CommandDefinition} name Command name
     * @returns {Promise<any>}
     */
    async run(name) {
        if (typeof name === "string") {
            let cmd = this.getCommand(this.commandConfigs, name.split("."));
            if (!cmd) throw new Error("Command not found: " + name);
            return await this.runCommand(cmd.command, cmd);
        } else {
            let command = this.program.commands.find(cmd => cmd.name() === name.name);
            if (!command) throw new Error("Command not found: " + name.name);
            return await this.runCommand(command, name);
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
            if (config.action) config.action(result);
            return result;
        } catch (err) {
            this.Logger.error("Crashed while executing the command: " + config.name || command.name());
            this.Logger.error(err);
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
     * @param {AppConfig} obj 
     */
    setUserConfig(obj) {
        this.userConfig = obj;
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
        let parsed = dotenv.config({ ...(this.config.envFile ? {} : { path: this.config.envFile }) });
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
    start() {
        this.program.parse(process.argv);
        this.loadConfigFromArgs();
        return this;
    }
    load() {
        this.isImported = true;
        this.loadConfigFromEnv().loadConfigFromObject(this.userConfig);
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
     * @param {AppEvents} type 
     * @param {GetCommand} listener 
     */
    on(type, listener) {
        this.events.on(type, listener);
        return this;
    }
}

const app = new App({ program, inquirer, chalk });

export {
    App,
    app,
};



