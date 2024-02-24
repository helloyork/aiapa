#!/usr/bin/env node

/**
 * @todo get product reviews
 * @todo how about gemini analysis these products?
 */

import { app } from "./src/cli.js";

const Options = {
    apiKey: {
        flags: "-k, --key, --api-key <key>",
        description: "The API key to use",
    },
    maxTask: {
        flags: "-t, --max-task --task <number>",
        description: "The maximum number of tasks to run",
        defaultValue: 10,
    },
    maxConcurrency: {
        flags: "-mc, --max-concurrency <number>",
        description: "The maximum number of concurrent tasks to run (larger = faster but may be banned :(",
        defaultValue: 5,
    },
    query: {
        flags: "-q, --query <string>",
        description: "The query to search for, for example: laptop",
    },
    output: {
        flags: "-o, --output <path>",
        description: "The path to the output file",
        defaultValue: "bin/output.json",
    },
    debug: {
        flags: "--debug",
        description: "Enable debug mode",
    },
    envFile: {
        flags: "--env, --env-file <path>",
        description: "The path to the .env file",
        defaultValue: ".env",
    },
    timeOut: {
        flags: "--time-out <number>",
        description: "The maximum time to wait for a task to complete",
        defaultValue: 60 * 1000,
    },
    verbose: {
        flags: "--verbose",
        description: "Enable verbose log mode",
    },
    headful: {
        flags: "--headful",
        description: "Enable headful mode (show browser if you want to see how the bot works, thats really cool :D",
    },
    force: {
        flags: "--force",
        description: "Force to run the program",
    },
}

/**
 * @typedef CommandConfig
 * @property {string} name
 * @property {string} description
 * @property {Function} [action]
 * @property {string} [scriptPath]
 * @property {{flags: string, description: string, defaultValue?: any}[]} [options]
 * @property {{[key: string]: CommandConfig}} [children]
 */
/**@type {{[key: string]: CommandConfig}} */
const Commands = {
    "get": {
        name: "get",
        description: "get product information from amazon",
        scriptPath: "src/commands/get.js",
        options: [Options.query, Options.output, Options.maxTask, Options.maxConcurrency, Options.timeOut, Options.headful, Options.debug, Options.envFile, Options.verbose, Options.apiKey],
    },
    "bin": {
        name: "bin",
        description: "bin methods",
        scriptPath: "src/commands/bin.js",
        children: {
            "clear": {
                name: "clear",
                description: "Clear the bin",
                scriptPath: "src/commands/bin/clear.js",
                options: [Options.force]
            }
        },
    },
    "test": {
        name: "test",
        description: "Test the program",
        scriptPath: "src/commands/test.js",
        children: {
            "sub": {
                name: "sub",
                description: "A sub command",
                scriptPath: "src/commands/test.js",
            }
        }
    }
};

const _Options = {
    "-k, --key, --api-key <key>": {
        description: "The API key to use",
    },
    "-t, --max-task --task <number>": {
        description: "The maximum number of tasks to run",
        defaultValue: 10,
    },
    "-mc, --max-concurrency <number>": {
        description: "The maximum number of concurrent tasks to run (larger = faster but may be banned :(",
        defaultValue: 5,
    },
    "-q, --query <string>": {
        description: "The query to search for, for example: laptop",
    },
    "-o, --output <path>": {
        description: "The path to the output file",
        defaultValue: "bin/output.json",
    },
    "--debug": {
        description: "Enable debug mode",
    },
    "--env, --env-file <path>": {
        description: "The path to the .env file",
        defaultValue: ".env",
    },
    "--time-out <number>": {
        description: "The maximum time to wait for a task to complete",
        defaultValue: 60 * 1000,
    },
    "--verbose": {
        description: "Enable verbose log mode",
    },
    "--headful": {
        description: "Enable headful mode (show browser if you want to see how the bot works, thats really cool :D",
    },
    "--force": {
        description: "Force to run the program",
    },
};

app.registerProgram({
    name: "AIAPA",
    description: "AI Analyzes Products on Amazon",
    version: "0.1.0",
})
    .registerCommands(Commands)
    .start();





