import { saveFile } from "../api/dat.js";
import { GenerativeAI } from "../api/generative.js";

const CommandRequiredConfig = {
    get: ["maxTask", "maxReviews"],
    analyze: []
};

/** @param {import("../types").App} app */
export default async function main(app) {
    if (app.isImported && !app.config.force) {
        app.Logger.warn("Do not start this command from code, and include the --force parameter if you think this is a bug.");
    }

    app.Logger.tagless(app.App.TitleArt)
        .tagless("Welcome to use AIAPA")
        .tagless("AIAPA is a tool that helps you to automactically summarize the product reviews\n");

    const options1 = ["start", "I already have the product information"];
    const ques1 = await app.UI.select("select an action to continue", options1);

    let file;

    if (ques1 === options1[0]) {
        app.Logger.info("getting the product information from Amazon");

        await completeConfig(app, "get");
        let module_get = await app.getModule(app.App.Commands.get);
        module_get.getConfig().skipSave = true;
        module_get.events.once(module_get.EventTypes.AFTER_COMMAND_RUN, (_, path) => {
            module_get.getConfig().skipSave = false;
            file = path;
        });

        app.Logger.tagless("\n");

        await app.run(app.App.Commands.get);
    }

    app.Logger.tagless("\n")
        .info("analyzing the product information");

    if (!app.config.GEMINI_API_KEY && !app.config.apiKey.length) {
        CommandRequiredConfig.analyze.push("apiKey");
    } else {
        app.setUserConfig({
            apiKey: [app.config.GEMINI_API_KEY, ...app.config.apiKey]
        });
    }

    app.Logger.tagless("\n")
        .info("AIAPA need gemini apikey to analyze product")
        .info(`If you don't have one, please go to ${app.UI.hex(app.UI.Colors.Blue)(GenerativeAI.GET_API_KEY)} and get one`)
        .info("it is free and easy to get");
    const set = await completeConfig(app, "analyze");
    app.setUserConfig({
        apiKey: [app.userConfig.apiKey]
    });
    if (set && await app.UI.confirm("Do you want to save the api key?")) {
        await saveFile(app.App.getFilePath("../.env"), `GEMINI_API_KEY="${app.userConfig.apiKey}"`);
    }

    if (file) {
        let module_analyze = await app.getModule(app.App.Commands.analyze);
        module_analyze.getConfig().file = file;
        module_analyze.getConfig().skipFileChoose = true;
    }
    await app.run(app.App.Commands.analyze);

    app.Logger.info(`AIAPA v${app.version} finished on ${new Date().toLocaleTimeString()}`);
}

/**
 * @param {import("../types").App} app
 * @param {string} command
 */
async function completeConfig(app, command) {
    const required = CommandRequiredConfig[command]; const config = {};
    if (!required || !required.length) return false;
    for (const key of required) {
        const v = await app.UI.input(`Enter ${key} (${app.App.Options[key].description}):`);
        if (v) config[key] = v;
    }
    app.setUserConfig(config);
    return true;
}
