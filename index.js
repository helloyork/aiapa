#!/usr/bin/env node

/**
 * @todo how about gemini analysis these products?
 */

import { app } from "./src/cli.js";
import { isImported } from "./src/api/dat.js";

export const Commands = app.App.Commands;

app.registerProgram({
    name: "AIAPA",
    description: "AI Analyzes Products on Amazon",
    version: "0.1.6",
})
    .registerCommands(Commands)
    .startIf(isImported(import.meta.url));


export {
    app
};


