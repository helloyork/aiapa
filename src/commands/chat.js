
import { ChatApp } from "../api/chat.js";
import { checkDirPermission, createDirIfNotExists, fileExists, generateUUID, getFilesToObj, joinPath, loadFile, saveFile, selectFile } from "../api/dat.js";
import { GenerativeAI, Chat } from "../api/generative.js";
import { getRenderable } from "./analyze.js";

/** @param {import("../types").App} app */
export default async function main(app) {
    await createDirIfNotExists(app.App.getFilePath(app.config.chatHistoryDir));
    if (!checkDirPermission(app.App.getFilePath(app.config.chatHistoryDir))) {
        app.Logger.error("No permission to write to: " + app.App.getFilePath(app.config.chatHistoryDir) + ", please check your permission");
        return;
    }

    const ai = new GenerativeAI(app, {
        apikeyPool: [...(app.config.GEMINI_API_KEY ? [app.config.GEMINI_API_KEY] : []), ...(app.config.apiKey ? [...app.config.apiKey] : [])]
    });
    await start({ app, ai });
}
/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} param0 
 */
async function start({ app, ai }) {
    let exit = false;
    while (!exit) {
        await mainMenu({ app, ai });
    }
}


/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} param0 
 */
async function mainMenu({ app, ai }) {
    console.clear();
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
            console.clear();
            app.Logger.info(`Chat started with id: ${app.UI.hex(app.UI.Colors.Blue)(id)}`)
                .tagless("Type .help to see the commands\n");
            await conversation({ app, ai, chat });
        },
        "history": async () => {
            let history = AppData.history;
            let ques1 = await app.UI.select("Choose the conversation", [...history.map(v => (`${v.name}(${v.id})`)), app.UI.separator()]);
            if (!ques1) return;
            let selected = history.find(v => `${v.name}(${v.id})` === ques1);
            let chat = new Chat(app, ai.getAPIRotated(), new ChatApp(app), {
                id: selected.id,
                name: selected.name
            });
            chat.start(selected);
            chat.chatApp.refresh();
            await conversation({ app, ai, chat });
        },
        "delete conversation": async () => {
            let history = AppData.history;
            let ques1 = await app.UI.checkbox("Choose the conversation to delete", [...history.map(v => (`${v.name}(${v.id})`)), app.UI.separator()]);
            if (!ques1) return;
            let selected = history.filter(v => ques1.includes(`${v.name}(${v.id})`));
            if (!selected) return;
            if (await app.UI.confirm("Are you sure you want to delete the selected conversation?")) {
                selected.forEach(v => {
                    v.deleted = true;
                });
                await saveChatRaw({ app }, { history: history.filter(v => !v.deleted) });
            }
        }
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
        let message = await app.UI.input("me: ");
        const commands = {
            ".exit": async function () {
                exit = true;
            },
            ".rename": async function () {
                let name = await app.UI.input("Enter the new name: ");
                if (name) chat.config.name = name;
            },
            ".delete": async function () {
                if (await app.UI.confirm("Are you sure you want to delete the conversation?")) {
                    chat.config.deleted = true;
                    exit = true;
                }
            },
            ".import": async function () {
                let file = await chooseFile({ app }, "Choose the file to import");
                if (!file) {
                    return;
                }
                /**@type {import("../types").ConcludedProduct[]} */
                let data = JSON.parse(await loadFile(file));
                let options = {};
                data.forEach(v => {
                    options[v.title] = v;
                });
                let product = await app.UI.selectByObject("Choose the product", options);
                if (!product) {
                    return;
                }
                let renderable = getRenderable([product]).products[0];
                if (!renderable) {
                    return;
                }
                let message_ = await app.UI.input(`me (product: ${product.title.slice(0, 46)}): `);
                if (commands[message_]) return await commands[message_]();

                let productData = Object.keys(renderable).map(v => v + ": " + (typeof renderable[v] === "string" ? renderable[v] : (
                    Array.isArray(renderable[v]) ? renderable[v].map(v => JSON.stringify(v)).join(", ") : JSON.stringify(renderable[v])
                ))).join("\n");

                let needTitle = false;
                if (chat.history.length <= 0) needTitle = true;

                await chat.sendStream(`PRODUCT DATA:\n${productData};\nUSER: ${message_}`, () => {
                    chat.chatApp.refresh();
                });

                if (needTitle) {
                    let title = await nameConversation({ chat, ai, app });
                    if (title && !(title instanceof Error)) chat.config.name = title;
                }
            },
            ".help": async function () {
                app.Logger.tagless("Commands:")
                    .tagless(".exit   - exit the conversation")
                    .tagless(".rename - rename the conversation")
                    .tagless(".delete - delete the conversation")
                    .tagless(".import - import a product")
                    .tagless(".help   - show this message")
                    .tagless("\n");
            }
        };
        if (commands[message]) {
            await commands[message]();
            await saveChat({ app, chat });
            continue;
        }

        let needTitle = false;
        if (chat.history.length <= 0) needTitle = true;

        await chat.sendStream(message, () => {
            chat.chatApp.refresh();
        });

        if (needTitle) {
            let title = await nameConversation({ chat, ai, app });
            if (title) chat.config.name = title;
        }

        chat.chatApp.refresh();
        await saveChat({ app, chat });
    }
    await saveChat({ app, chat });
    ai.exit();
}

/**
 * @param {{app: import("../types").App, ai: GenerativeAI, chat: Chat}} param0 
 */
async function nameConversation({ chat, ai }) {
    let conv = chat.getHistory().map(v => v.content).join("\n");
    let res = await ai.getAPIRotated().call(`Based on the conversation, give a user-friendly name of length 5 to 40 for the conversation. DATA:\n${conv}`);
    if (res instanceof Error) {
        return null;
    }
    return res;
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
 * @param {{app: import("../types").App, chat: Chat}} param0 
 */
async function saveChat({ app, chat }) {
    let path = app.App.getFilePath(joinPath(app.config.chatHistoryDir, app.config.chatHistory));
    /**@type {import("../types").ChatHistory} */
    let data = await loadChat({ app });
    data.history = [...((chat.config.deleted && chat) ? [] : [chat.toData()]), ...data.history.filter(v => v.id !== chat.config.id)];
    await saveFile(path, JSON.stringify(data));
}

async function saveChatRaw({ app}, data) {
    let path = app.App.getFilePath(joinPath(app.config.chatHistoryDir, app.config.chatHistory));
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

