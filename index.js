#!/usr/bin/env node

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
    }
};

app.registerProgram({
    name: "AIAPA",
    description: "AI Analysis Amazon Product",
    version: "0.1.0",
})
    .registerCommands(Commands)
    .registerOptions(Options)
    .start();





