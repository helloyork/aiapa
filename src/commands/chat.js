
import { ChatApp } from "../api/chat.js";
import { checkDirPermission, createDirIfNotExists, getFilesToObj, selectFile } from "../api/dat.js";
import { GenerativeAI, Chat } from "../api/generative.js";

const config = {

};

/** @param {import("../types").App} app */
export default async function main(app) {
    if (!checkDirPermission(app.App.getFilePath("../"))) {
        app.Logger.error("No permission to write to: " + app.App.getFilePath("../") + ", please check your permission");
        return;
    }

    let file = await chooseFile(app, "Choose the file to chat with");
    if (!file) {
        throw app.Logger.error(new Error("file is required"));
    }

    app.config.file = file;
    app.Logger.info(`file: ${app.UI.hex(app.UI.Colors.Blue)(file)}`);
    const ai = new GenerativeAI(app, {
        apikeyPool: [...(app.config.GEMINI_API_KEY ? [app.config.GEMINI_API_KEY] : []), ...(app.config.apiKey ? [...app.config.apiKey] : [])]
    });
}

/**
 * @param {{app: import("../types").App}} param0 
 */
async function mainMenu({ app }) {
    const Menu = {
        "new conversation": async () => {
        },
        "history": async () => {
        },
    };
}

async function _chat({ app }) {}

/** @param {{app: import("../types").App}} app */
async function chooseFile({ app }, prompt) {
    let file = app.config.file;
    if (!file) {
        const otherPromt = "OTHER (select file).";
        await createDirIfNotExists(app.config.binPath);
        const files = await getFilesToObj(app.App.getFilePath(app.config.binPath));
        const quetions = [...Object.keys(files).filter(v => v.endsWith(".json")), app.UI.separator(), otherPromt, app.UI.separator()];
        const res = await app.UI.select(prompt, quetions);
        if (res === otherPromt) {
            try {
                file = await selectFile({ types: [["JSON", "*.json"]] });
            } catch (err) {
                app.Logger.warn(err.message);
                file = await app.UI.input("Enter the file path: ");
            }
        } else {
            file = files[res];
        }
    }
    return file;
}

