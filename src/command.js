
export const Options = {
    apiKey: {
        flags: "-k, --api-key [keys...]",
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
        description: "The maximum time to wait for a task to complete in milliseconds",
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
    maxReviews: {
        flags: "-r, --max-reviews <number>",
        description: "The maximum number of pages to get reviews from, can't more than 10 pages (1 page = 10 critical reviews + 10 positive reviews)",
        defaultValue: 10,
    },
    lowRam: {
        flags: "--low-ram",
        description: "Enable low ram mode",
    },
    proxy: {
        flags: "--proxy",
        description: "using proxy",
    },
    file: {
        flags: "-f, --file <path>",
        description: "The path to the file",
    },
    model: {
        flags: "-m, --model <string>",
        description: "The model to use",
    },
};
export const Scripts = {
    get: "./commands/get.js",
    analyze: "./commands/analyze.js",
    bin: "./commands/bin.js",
    test: "./commands/test.js",
    "bin/clean": "./commands/bin/clean.js",
    "bin/clear": "./commands/bin/clean.js",
    "bin/list": "./commands/bin/list.js",
    "bin/whereis": "./commands/bin/whereis.js",
};

/**
 * @typedef {import("./cli.js").CommandDefinition} CommandDefinition
 */
/**
 * @typedef {Object} Commands
 * @property {CommandDefinition} get
 * @property {CommandDefinition} bin
 */
/**@type {Commands} */
export const Commands = {
    "get": {
        name: "get",
        description: "get product information from amazon",
        scriptPath: Scripts.get,
        options: [Options.query, Options.output, Options.maxTask, Options.maxConcurrency, Options.maxReviews, Options.timeOut, Options.headful, Options.debug, Options.verbose, Options.lowRam, Options.proxy],
    },
    "analyze": {
        name: "analyze",
        description: "analyze product information",
        scriptPath: Scripts.analyze,
        options: [Options.debug, Options.verbose, Options.file, Options.model]
    },
    "bin": {
        name: "bin",
        description: "bin methods",
        scriptPath: Scripts.bin,
        children: {
            "clean": {
                name: "clean",
                description: "Clean the bin",
                scriptPath: Scripts["bin/clean"],
                options: [Options.force]
            },
            "clear": {
                name: "clear",
                description: "Clean the bin",
                scriptPath: Scripts["bin/clean"],
                options: [Options.force]
            },
            "list": {
                name: "list",
                description: "List the bin",
                scriptPath: Scripts["bin/list"],
                options: []
            },
            "whereis": {
                name: "whereis",
                description: "Show the bin location",
                scriptPath: Scripts["bin/whereis"],
                options: []
            },
        },
    },
    "test": {
        name: "test",
        description: "test methods",
        scriptPath: Scripts.test,
        options: [...Object.values(Options)]
    },
    "start": {
        name: "start",
        description: "AIAPA wizard",
        scriptPath: "./commands/start.js",
        options: [Options.force, Options.debug, Options.verbose]
    },
};
