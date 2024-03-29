import * as commander from "commander";
import path, { resolve, dirname } from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import url from "url";
import dotenv from "dotenv";

import { Logger, EventEmitter } from "./utils.js";
import ui from "./ui.js";
import { getHomeDir, isMacosOrLinux, joinPath, resolveFromCwd } from "./api/dat.js";
import { Commands, Options } from "./command.js";

const { program, Option } = commander;

class App {
    /* Static */
    static scriptCache = {};
    static async loadScript(scriptPath) {
        if (this.scriptCache[scriptPath]) return this.scriptCache[scriptPath];
        app.Logger.verbose("Loading dynamic script: " + this.getFilePath(scriptPath));
        const module = await import(url.pathToFileURL(this.getFilePath(scriptPath)));
        this.scriptCache[scriptPath] = module;
        return module;
    }

    static getFilePath(relativePath) {
        return resolve(dirname(url.fileURLToPath(import.meta.url)), relativePath);
    }

    static Option = Option;
    static Options = Options;
    static UI = ui;
    static Commands = Commands;
    static staticConfig = {
        MAX_TRY: 128,
        USER_AGENTS_PATH: "./dat/user-agents.txt",
        DELAY_BETWEEN_TASK: 3 * 1000
    };

    static Events = {
        beforeCommandRun: "beforeCommandRun"
    };

    static defaultConfig = {
        debug: false,
        proxy: false,
        force: false,
        lowRam: false,
        verbose: false,
        headful: false,
        query: "",
        binPath: isMacosOrLinux() ? joinPath(getHomeDir(), "./.bin/aiapa/") : "../bin",
        output: "",
        model: "gemini-pro",
        chatHistoryDir: isMacosOrLinux() ? joinPath(getHomeDir(), "./.bin/aiapa_chat") : "../aiapa_chat",
        chatHistory: "chat_history.json",
        maxTask: 10,
        maxReviews: 10,
        maxConcurrency: 5,
        timeOut: 60 * 1000,
        envFile: path.resolve(process.cwd(), ".env"),
        apiKey: [],
        file: null
    };

    static __init() {
        this.defaultConfig.output = this.getFilePath(this.defaultConfig.binPath);
    }

    static exitCode = {
        OK: 0,
        ERROR: 1
    };

    static exit(code) {
        process.exit(code);
    }

    static TitleArt = "\n     ____  ____   ____  ____   ____ \n    /    ||    | /    ||    \\ /    |\n   |  o  | |  | |  o  ||  o  )  o  |\n   |     | |  | |     ||   _/|     |\n   |  _  | |  | |  _  ||  |  |  _  |\n   |  |  | |  | |  |  ||  |  |  |  |\n   |__|__||____||__|__||__|  |__|__|\n\n";

    /* Constructor */
    constructor({ program, inquirer, chalk }) {
        this.program = program;
        this.inquirer = inquirer;
        this.chalk = chalk;
    }

    /* Properties */
    Logger = new Logger(this);
    config = {};
    userConfig = {};
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

    registerProgram({ name, description, version }) {
        this.program
            .name(name)
            .description(description)
            .version(version);
        this.name = name;
        this.description = description;
        this.version = version;
        this.program.addHelpText("before", App.TitleArt);
        return this;
    }

    getCommandTree(parent) {
        if (!parent) return;
        const output = {};
        Object.entries(parent).forEach(([key, value]) => {
            output[key] = { ...value, children: this.getCommandTree(value.children) };
        });
        return output;
    }

    getCommand(parent, args) {
        if (!args || !parent || (Array.isArray(args) && !args.length)) return parent;
        const [key, ...rest] = args;
        if (parent[key]) {
            if (rest.length && parent[key].children) return this.getCommand(parent[key].children, rest);
            return parent[key];
        }
        return parent;
    }

    async getModule(cmd) {
        return await App.loadScript(cmd.scriptPath); 
    }

    async run(cmd) {
        if (typeof cmd === "string") {
            const cmd = this.getCommand(this.commandConfigs, cmd.split("."));
            if (!cmd) throw new Error("Command not found: " + cmd);
            return await this.runCommand(cmd.command, cmd);
        } else {
            const command = this.program.commands.find(_cmd => (_cmd.name() === cmd.name));
            if (!command) throw new Error("Command not found: " + cmd.name);
            return await this.runCommand(command, cmd);
        }
    }

    async runCommand(command, config) {
        if (!this.isImported) this.loadConfigFromArgs(command.opts()).loadConfigFromObject(this.userConfig);
        try {
            const module = await App.loadScript(config.scriptPath || command.name());
            this.mainModule = module;
            this.emit(App.Events.beforeCommandRun, this, module);
            const result = await module.default?.(app);
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

    registerCommand(command, parent = this.program, root = {}) {
        const cmd = new commander.Command(command.name)
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

    registerCommands(commands, parent = this.program, root = this.commandConfigs) {
        if (!this.commandConfigs) this.commandConfigs = {};
        Object.entries(commands).forEach(([, command]) => {
            this.registerCommand(command, parent, root);
        });
        return this;
    }

    registerOptions(options) {
        Object.entries(options).forEach(([name, option]) => {
            this.program.option(name, option.description, option.defaultValue);
        });
        return this;
    }

    setUserConfig(obj) {
        Object.assign(this.userConfig, obj);
        this.loadConfigFromObject(obj);
        return this;
    }

    convert(args = {}) {
        const o = {};
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
        const parsed = dotenv.config({ ...(this.config.envFile ? { path: resolveFromCwd(this.config.envFile) } : {}) });
        // if(parsed.error) {
        //     this.Logger.error("Error occurred while loading .env file");
        //     this.crash(parsed.error);
        // }
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
        this.loadConfigFromArgs().loadConfigFromEnv();
        return this;
    }

    load() {
        this.isImported = true;
        this.loadConfigFromObject(this.userConfig).loadConfigFromEnv();
        return this;
    }

    emit(type, ...args) {
        this.events.emit(type, ...args);
        return this;
    }

    on(type, listener) {
        this.events.on(type, listener);
        return this;
    }

    once(type, listener) {
        this.events.once(type, listener);
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
App.__init();

/** @type {import("./types/index.js").App} */
const app = new App({ program, inquirer, chalk });

export {
    App,
    app
};
