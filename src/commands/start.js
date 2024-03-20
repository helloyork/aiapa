
const CommandRequiredConfig = {
    "get": ["maxTask", "maxReviews"],
    "analyze": ["apiKey"]
};

/**@param {import("../types").App} app */
export default async function main(app) {
    if(app.isImported && !app.config.force) {
        app.Logger.warn("Do not start this command from code, and include the --force parameter if you think this is a bug.");
    }

    app.Logger.tagless(app.App.TitleArt)
        .tagless("Welcome to use AIAPA")
        .tagless("AIAPA is a tool that helps you to automactically summarize the product reviews\n");
    
    let options1 = ["start", "I already have the product information"];
    let ques1 = await app.UI.select("select an action to continue",options1);

    app.Logger.info("getting the product information from Amazon");

    let file;

    if(ques1 === options1[0]) {
        await completeConfig(app, "get");
        app.once(app.App.Events.beforeCommandRun, (_, /**@type {typeof import("./get")} */mod)=>{
            mod.getConfig().skipSave = true;
            mod.events.once(mod.EventTypes.AFTER_COMMAND_RUN, (_, path) => {
                mod.getConfig().skipSave = false;
                file = path;
            });
        });

        await app.run(app.App.Commands.get);
    }

    app.Logger.tagless("\n")
        .info("analyzing the product information");
    
    await completeConfig(app, "analyze");
    app.setUserConfig({
        apiKey: [app.userConfig.apiKey]
    });

    if (file) app.once(app.App.Events.beforeCommandRun, (_, mod) => {
        mod.getConfig().file = file;
        mod.getConfig().skipFileChoose = true;
        console.log(file)
    });
    await app.run(app.App.Commands.analyze);

    app.Logger.info(`AIAPA v${app.version} finished on ${new Date().toLocaleTimeString()}`);
}

/**
 * @param {import("../types").App} app
 * @param {string} command
 */
async function completeConfig(app, command) {
    app.Logger.info("please enter the config, leave it empty to use the default value");
    let required = CommandRequiredConfig[command], config = {};
    for (let key of required) {
        let v = await app.UI.input(`Enter ${key} (${app.App.Options[key].description}):`);
        if (v) config[key] = v;
    }
    app.setUserConfig(config);
}
