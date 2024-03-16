
import * as commander from 'commander';
import { absolutePath, relativePath } from './commands/dat';
import { UI } from "./ui";
import { Commands, Options } from './command';

import * as get from '../commands/get';
import * as bin from '../commands/bin';
import * as analyze from '../commands/analyze';
import * as clean from '../commands/bin/clean';
import * as list from '../commands/bin/list';
import * as whereis from '../commands/bin/whereis';

import { EventEmitter, Logger } from './utils';

type CommandRuntimeModule = typeof get | typeof bin | typeof analyze | typeof clean | typeof list | typeof whereis;
type CommandRuntimeCallback = (app: App, module: CommandRuntimeModule) => void;
interface AppConfig {
    debug: boolean;
    verbose: boolean;
    headful: boolean;
    force: boolean;
    lowRam: boolean;
    proxy: boolean;
    apiKey: string[];
    envFile: string;
    query: string;
    output: string;
    binPath: string;
    model: string;
    absolutePath: absolutePath;
    relativePath: relativePath;
    maxTask: number;
    maxConcurrency: number;
    timeOut: number;
    maxReviews: number;
    file: null | string;
}
interface EnvConfig {
    GEMINI_API_KEY: string;
}
interface ProgramDefinition {
    name: string;
    description: string;
    version: string;
}
interface OptionDefinition {
    flags: string[];
    description: string;
    defaultValue?: any;
}

export interface CommandDefinition {
    name: string;
    description: string;
    action?: Function;
    scriptPath?: string;
    options?: OptionDefinition[];
    children?: { [key: string]: CommandDefinition };
    command?: commander.Command;
}

export declare class App {
    static loadScript: (scriptPath: relativePath) => Promise<any>;
    static getFilePath: (filePath: relativePath) => absolutePath;
    static Option: commander.Option;
    static Options: typeof Options
    static UI: typeof UI;
    static Commands: Commands;
    static staticConfig: {
        MAX_TRY: number;
        USER_AGENTS_PATH: string;
        DELAY_BETWEEN_TASK: number;
    };
    static Events: {
        beforeCommandRun: "beforeCommandRun"
    };
    static defaultConfig: AppConfig & EnvConfig;
    static exitCode: {
        OK: 0;
        ERROR: 1;
    };
    static exit: (code: typeof App.exitCode[keyof typeof App.exitCode]) => void;

    Logger: Logger;
    config: AppConfig & EnvConfig;
    userConfig: AppConfig;
    commandConfigs: { [key: string]: CommandDefinition };
    isImported: boolean;
    events: EventEmitter;
    mainModule: any;
    program: commander.Command;
    name: string;
    description: string;
    version: string;

    get App(): typeof App;
    get options(): commander.OptionValues;
    get UI(): typeof UI;
    registerProgram: ({ name, description, version }: ProgramDefinition) => this;
    getCommandTree: (parent: any) => ({ [key: string]: CommandDefinition });
    getCommand: (parent: any, args: any) => any;
    /**
     * run a command
     * @param cmd
     * @example
     * // run command using string
     * app.run("bin.list");
     * // or using Command Definition
     * import { app, Commands } from "aiapa";
     * app.run(Commands.bin);
     */
    public run: (cmd: string | CommandDefinition) => Promise<any>;
    runCommand: (command: commander.Command, config: CommandDefinition) => Promise<any>;
    registerCommand: (command: CommandDefinition) => this;
    registerCommands: (commands: { [key: string]: CommandDefinition }) => this;
    registerOptions: (options: { [key: string]: { description: string, defaultValue: any } }) => this;
    /**
     * use this method to set user config
     * @param obj
     * @example
     * app.setUserConfig({
     *     debug: true,
     *     verbose: true,
     *     force: true,
     *     lowRam: true,
     *     output: "./output",
     * });
     */
    public setUserConfig: (obj: AppConfig) => this;
    convert: (args: any) => any;
    loadConfigFromObject: (obj: Object) => this;
    loadConfigFromEnv: () => this;
    loadConfigFromArgs: (options: any) => this;
    startIf: (v: boolean) => this;
    /**
     * YOU SHOULD NOT CALL THIS METHOD IN YOUR CODE INTERFACE LAUNCHER  
     * this method is only for the cli, this will parse args from cli and automatically launch the app
     */
    start: () => this;
    /**
     * you should call this method before start and after you have set all the config
     */
    public load: () => this;
    emit: (type: keyof typeof App.Events, ...args: any[]) => this;
    /**
     * Listen to an event
     * @param event 
     * @param callback 
     * @example
     * app.on("beforeCommandRun", (cmd, mod) => {
     *     mod.registerDetailSelector("links", {
     *         querySelector: "a",
     *         evaluate: (el) => el.href
     *     });
     * })
     * @returns 
     */
    public on(event: "beforeCommandRun", callback: CommandRuntimeCallback): this;
    public exit: (code: typeof App.exitCode[keyof typeof App.exitCode]) => void;
    /**
     * ok, em, this method is used to crash the app, I don't want this happen right?
     */
    public crash: (err: Error | string) => void;
}

