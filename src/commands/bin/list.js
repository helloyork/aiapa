import { getFilesInDir, resolve } from "../../api/dat.js";

/** @param {import("../../cli.js").App} app */
export default async function main (app) {
    const files = await getFilesInDir(app.App.getFilePath(app.config.binPath));
    for (const file of files) {
        app.Logger.info(`${file} - ${app.UI.hex(app.UI.Colors.Blue)(resolve(app.App.getFilePath(app.config.binPath), file))}`);
    }
}
