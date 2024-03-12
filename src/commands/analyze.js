
import { getFilesToObj } from "../api/dat.js";
/**@param {import("../types").App} app */
export default async function main(app) {
    if(app.isImported) {
        let missing = ["file"].filter(k => Object.prototype.hasOwnProperty.call(app.config, k));
        if(missing.length > 0) {
            throw app.Logger.error(new Error(`missing required config ${missing.join(", ")}`));
        }
    }

    let file = app.config.file;
    if (!file) {
        let otherPromt = "OTHER (enter file path).";
        let files = await getFilesToObj(app.App.getFilePath(app.config.binPath));
        let quetions = [...Object.keys(files), app.UI.separator(), otherPromt, app.UI.separator()];
        let res = await app.UI.select("select a file as input", quetions);
        file = res === otherPromt ? await app.UI.input("enter file path:") : files[res];
    }

    if (!file) {
        throw app.Logger.error(new Error("file is required"));
    }

    app.config.file = file;
    app.Logger.info(`file: ${app.UI.hex(app.UI.Colors.Blue)(file)}`);
}
