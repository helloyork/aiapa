
const CommandRequiredConfig = {
    "get": ["maxTask", "maxReviews"],
    "analyze": []
};

/**@param {import("../types").App} app */
export default async function main(app) {
    if(app.isImported && !app.config.force) {
        app.Logger.warn("Do not start this command from code, and include the --force parameter if you think this is a bug.");
    }

    app.Logger.info("Welcome to use AIAPA");
    app.Logger.info("AIAPA is a tool that helps you to automactically summarize the product reviews");
    
    let options1 = ["start", "I already have the product information"];
    let ques1 = await app.UI.select("select an action to continue",options1);

    app.Logger.info("getting the product information from Amazon");
    if(ques1 === options1[0]) {
        await completeConfig(app, "get");
        await app.run(app.App.Commands.get);
    }

    app.Logger.info("analyzing the product information");
    await completeConfig(app, "analyze");
    await app.run(app.App.Commands.analyze);

    app.Logger.info(`AIAPA v${app.version} finished on ${new Date().toUTCString()}`);
}

/**
 * @param {import("../types").App} app
 * @param {string} command
 */
async function completeConfig(app, command) {
    app.Logger.info("please enter the required config, leave it empty to use the default value");
    let required = CommandRequiredConfig[command];
    for (let key of required) {
        let v = await app.UI.input(`Enter ${key} (${app.App.Options[key].description}):`);
        if (v) app.config[key] = v;
    }
}
