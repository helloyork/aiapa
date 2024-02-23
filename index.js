#!/usr/bin/env node

/**
 * @todo get product reviews
 * @todo how about gemini analysis these products?
 */

import { app } from "./src/cli.js";

/**@type {{[key: string]: {name: string, description: string, action?: Function, scriptPath?: string}}} */
const Commands = {
    "analyze": {
        name: "analyze",
        description: "AI Analysis Amazon Product",
        scriptPath: "src/commands/analyze.js"
    },
    "analyse": {
        name: "analyse",
        description: "AI Analysis Amazon Product",
        scriptPath: "src/commands/analyze.js"
    },
    "test": {
        name: "test",
        description: "Test the program",
        scriptPath: "src/commands/test.js"
    }
};

const Options = {
    "--debug": {
        description: "Enable debug mode",
        defaultValue: false,
    },
    "--key, --api-key <key>": {
        description: "The API key to use",
        defaultValue: "",
    },
    "--env, --env-file <path>": {
        description: "The path to the .env file",
        defaultValue: ".env",
    },
    "--max-task --task <number>": {
        description: "The maximum number of tasks to run",
        defaultValue: 10,
    },
    "--max-concurrency <number>": {
        description: "The maximum number of concurrent tasks to run",
        defaultValue: 5,
    },
    "--time-out <number>": {
        description: "The maximum time to wait for a task to complete",
        defaultValue: 60 * 1000,
    },
    "--query <string>": {
        description: "The query to search for, for example: laptop",
        defaultValue: "",
    },
    "--verbose": {
        description: "Enable verbose log mode",
        defaultValue: false,
    },
    "--headful": {
        description: "Enable headful mode (show browser if you want to see how the bot works, thats really cool :D",
        defaultValue: false,
    },
};

app.registerProgram({
    name: "AIAPA",
    description: "AI Analyzes Products on Amazon",
    version: "0.1.0",
})
    .registerOptions(Options)
    .registerCommands(Commands)
    .start();





