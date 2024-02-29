import { GenerativeAI } from "../api/generative.js";
import { Rejected } from "../utils.js";


/**@param {import("../cli.js").App} app */
export default async function main(app) {
    if(!app.config.debug) {
        app.Logger.warn("Debug mode is not enabled. Enable it by passing --debug or user config {\"debug\":true} to the command.");
        return;
    }
    console.log(app.config)
    let ai = new GenerativeAI(app);
    let result = await ai.call("Who are you?");
    if(Rejected.isRejected(result)) return app.Logger.error("Rejected: " + result.message);
    console.log(result);
    ai.exit();
}

