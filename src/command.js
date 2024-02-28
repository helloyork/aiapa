
/**@type {{[ket: string]: import("./cli.js").OptionDefinition}} */
export const Options = {
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
        defaultValue: "bin",
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
    maxReviews: {
        flags: "-r, --max-reviews <number>",
        description: "The maximum number of pages to get reviews from, can't more than 10 pages (1 page = 10 reviews)",
        defaultValue: 10,
    },
    lowRam: {
        flags: "--low-ram",
        description: "Enable low ram mode",
    }
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
        scriptPath: "./commands/get.js",
        options: [Options.query, Options.output, Options.maxTask, Options.maxConcurrency, Options.timeOut, Options.headful, Options.debug, Options.verbose, Options.maxReviews, Options.lowRam],
    },
    "bin": {
        name: "bin",
        description: "bin methods",
        scriptPath: "./commands/bin.js",
        children: {
            "clean": {
                name: "clean",
                description: "Clean the bin",
                scriptPath: "./commands/bin/clean.js",
                options: [Options.force, Options.debug]
            },
            "clear": {
                name: "clear",
                description: "Clean the bin",
                scriptPath: "./commands/bin/clean.js",
                options: [Options.force, Options.debug]
            },
        },
    }
};
