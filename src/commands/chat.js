
import { ChatApp } from "../api/chat.js";
import { checkDirPermission, createDirIfNotExists, fileExists, generateUUID, getFilesToObj, joinPath, loadFile, saveFile, selectFile } from "../api/dat.js";
import { GenerativeAI, Chat } from "../api/generative.js";

const config = {

};

/** @param {import("../types").App} app */
export default async function main(app) {
    await createDirIfNotExists(app.App.getFilePath(app.config.chatHistoryDir));
    if (!checkDirPermission(app.App.getFilePath(app.config.chatHistoryDir))) {
        app.Logger.error("No permission to write to: " + app.App.getFilePath(app.config.chatHistoryDir) + ", please check your permission");
        return;
    }

    let file = await chooseFile({app}, "Choose the file to chat with");
    if (!file) {
        throw app.Logger.error(new Error("file is required"));
    }

    app.config.file = file;
    app.Logger.info(`file: ${app.UI.hex(app.UI.Colors.Blue)(file)}`);
    const ai = new GenerativeAI(app, {
        apikeyPool: [...(app.config.GEMINI_API_KEY ? [app.config.GEMINI_API_KEY] : []), ...(app.config.apiKey ? [...app.config.apiKey] : [])]
    });
    await start({ app, ai });
}
/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} param0 
 */
async function start({ app, ai }) {
    await mainMenu({ app, ai });
}


/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} param0 
 */
async function mainMenu({ app, ai }) {
    /**@type {import("../types").ChatHistory} */
    let AppData = await loadChat({ app });
    if (AppData instanceof Error) {
        app.exit(app.App.exitCode.ERROR);
    }
    const Menu = {
        "new conversation": async () => {
            let id = generateUUID();
            let chat = new Chat(app, ai.getAPIRotated(), new ChatApp(app), {
                id,
                name: id
            });
            chat.start();
            await conversation({ app, ai, chat });
        },
        "history": async () => {
            let history = AppData.history;
            let ques1 = await app.UI.select("Choose the conversation", history.map(v => (`${v.name}(${v.id})`)));
            if(!ques1) return;
            let selected = history.find(v => `${v.name}(${v.id})` === ques1);
            let chat = new Chat(app, ai.getAPIRotated(), new ChatApp(app), {
                id: selected.id,
                name: selected.name
            });
            chat.start(selected);
            await conversation({ app, ai, chat });
        },
    };
    let ques1 = await app.UI.select("Choose the option", Object.keys(Menu));
    await Menu[ques1]();
}

/**
 * @param {{app: import("../types").App, ai: GenerativeAI, chat: Chat}} param0 
 */
async function conversation({ app, ai, chat }) {
    let exit = false;
    while (!exit) {
        let message = await app.UI.input("You: ");
        if (message === ".exit") {
            exit = true;
            continue;
        }
        await chat.sendStream(message, () => {
            chat.chatApp.refresh();
        });

        await saveChat({ app, chat });
    }
    ai.exit();
}

/**
 * @param {{app: import("../types").App}} param0 
 * @returns {Promsie<import("../types").ChatHistory|Error>}
 */
async function loadChat({ app }) {
    try {
        let path = app.App.getFilePath(joinPath(app.config.chatHistoryDir, app.config.chatHistory));
        let fileExi = await fileExists(path);
        if (!fileExi) {
            await saveFile(path, JSON.stringify({ history: [] }));
        }
        let result = JSON.parse(await loadFile(path));
        return result;
    } catch (err) {
        return app.Logger.error(err.message);
    }
}

/**
 * @param {{app: import("../types").App, ai: GenerativeAI, chat: Chat}} param0 
 */
async function saveChat({ app, chat }) {
    let path = app.App.getFilePath(joinPath(app.config.chatHistoryDir, app.config.chatHistory));
    /**@type {import("../types").ChatHistory} */
    let data = await loadChat({ app });
    data.history = [...data.history.filter(v=>v.id !== chat.config.id), chat.toData()];
    await saveFile(path, JSON.stringify(data));
}

/** @param {{app: import("../types").App}} app */
async function chooseFile({ app }, prompt) {
    let file;
    const otherPromt = "OTHER (select file).";
    await createDirIfNotExists(app.App.getFilePath(app.config.binPath));
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
    return file;
}

