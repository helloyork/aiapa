#!/usr/bin/env node

/**
 * @todo life cycle events
 * @todo low ram mode
 * @todo save as csv
 * @todo gemini google api
 * @todo how about gemini analysis these products?
 */

import { app } from "./src/cli.js";
import { isImported } from "./src/api/dat.js";
import { Commands } from "./src/command.js";
export { Commands } from "./src/command.js";

app.registerProgram({
    name: "AIAPA",
    description: "AI Analyzes Products on Amazon",
    version: "0.1.3",
})
    .registerCommands(Commands)
    .startIf(isImported(import.meta.url));


export {
    app,
};


