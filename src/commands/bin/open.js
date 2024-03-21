import { openFolder } from "../../api/dat.js";

/**@type {import("../../types").App} */
export default async function main (app) {
    openFolder(app.App.getFilePath(app.config.binPath));
}
