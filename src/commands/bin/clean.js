import { clearDirectory } from "../../api/dat.js";

/** @param {import("../../cli.js").App} app */
export default async function main(app) {
    if (!app.config.force) {
        if (!await app.UI.confirm("Are you sure you want to clear the directory?")) {
            app.Logger.info("Aborted");
            return;
        }
    } else {
        app.Logger.warn("Force mode enabled, no confirmation will be asked");
    }
    app.Logger.info("Clearing directory");
    app.Logger.info(`Directory: ${app.App.getFilePath(app.config.binPath)}`);
    await clearDirectory(app.App.getFilePath(app.config.binPath), (file) => {
        app.Logger.info(`Deleted ${file}`);
    });
    app.Logger.info("Directory cleared");
}
