


/**@param {import("../../cli.js").App} app */
export default async function main(app) {
    app.Logger.info(`bin path: ${app.App.getFilePath(app.config.binPath)}`);
}
