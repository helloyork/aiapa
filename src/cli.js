
import * as commander from "commander";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import url from "url";
import dotenv from "dotenv";
import { Logger } from "./utils.js";

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
 */
class App {
    /* Static */
    static async loadScript(scriptPath) {
        const module = await import(url.pathToFileURL(path.resolve(process.cwd(), scriptPath)).href);
        return module;
    }
    static Option = Option;
    static UI = ui;
    static staticConfig = {
        MAX_TRY: 128,
    };
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
        output: "bin",
        force: false,
        binPath: "bin",
        maxReviews: 10,
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
    /**
     * Register commands to the program
     * @param {{[key: string]: CommandDefinition}} commands 
     * @returns {this}
     */
    registerCommands(commands, parent = this.program) {
        Object.entries(commands).forEach(([name, command]) => {
            let cmd = new commander.Command(name)
                .description(command.description)
                .action(async () => {
                    this.loadConfigFromArgs(cmd.opts()).loadConfigFromEnv();
                    try {
                        const module = await App.loadScript(command.scriptPath || name);
                        await module.default?.(app);
                        if (command.action) command.action(module);
                    } catch (err) {
                        this.Logger.error("Crashed while executing the command: " + name);
                        this.Logger.error(err);
                    }
                });
            command.options?.forEach(option => {
                cmd.option(option.flags, option.description, option.defaultValue);
            });
            parent.addCommand(cmd);
            if (command.children) this.registerCommands(command.children, cmd);
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
    loadConfigFromEnv() {
        let parsed = dotenv.config({ ...(this.config.envFile ? {} : { path: this.config.envFile }) });
        this.config = { ...App.defaultConfig, ...this.config, ...(parsed ? parsed.parsed : {}) };
        return this;
    }
    loadConfigFromArgs(options) {
        this.config = { ...App.defaultConfig, ...this.config, ...this.options, ...options };
        return this;
    }
    start() {
        this.program.parse(process.argv);
        return this;
    }
}

const app = new App({ program, inquirer, chalk });

export {
    App,
    app,
};



