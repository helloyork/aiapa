
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
 */
/**
 * @typedef EnvConfig
 * @property {string} GEMINI_API_KEY
 */
class App {
    /* Static */
    static async loadScript(scriptPath) {
        const module = await import(url.pathToFileURL(path.resolve(process.cwd(), scriptPath)).href);
        return module;
    }
    static Option = Option;
    static UI = ui;
    static defaultConfig = {
        debug: false,
        envFile: path.resolve(process.cwd(), ".env"),
        apiKey: process.env.GEMINI_API_KEY || "",
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
    Logger = new Logger(this.App.UI);
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
     * @typedef {Object} ProgramDefinition
     * @property {string} name
     * @property {string} description
     * @property {string} version
     */
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
     * @typedef {Object} CommandDefinition
     * @property {string} name
     * @property {string} description
     * @property {Function} [action]
     * @property {string} [scriptPath]
     */
    /**
     * Register commands to the program
     * @param {{[key: string]: CommandDefinition}} commands 
     * @returns {this}
     */
    registerCommands(commands) {
        Object.entries(commands).forEach(([name, command]) => {
            this.program.command(name)
                .description(command.description)
                .action(async () => {
                    const module = await App.loadScript(command.scriptPath || name);
                    await module.default?.(app);
                    if (command.action) command.action(module);
                });
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
    loadConfigFromArgs() {
        this.config = { ...App.defaultConfig, ...this.config, ...this.options };
        return this;
    }
    start() {
        this.program.parse(process.argv);
        this.loadConfigFromArgs().loadConfigFromEnv();
        return this;
    }
}

const app = new App({ program, inquirer, chalk });

export {
    App,
    app,
};



