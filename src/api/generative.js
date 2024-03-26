import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

import { loadFile, loadFileSync } from "./dat.js";
import { Rejected, RPM } from "../utils.js";
import { App } from "../cli.js";

const models = JSON.parse(loadFileSync(App.getFilePath("./dat/models.json")));

/**
 * @typedef {Object} MIME
 * @property {"image/png"|"image/jpeg"|"image/webp"|"image/heic"|"image/heif"} type
 */
export const MIME = {
    PNG: "image/png",
    JPEG: "image/jpeg",
    WEBP: "image/webp",
    HEIC: "image/heic",
    HEIF: "image/heif"
};

/**
 * @typedef {import("../cli.js").App} App
 * @typedef {import("../cli.js").AppConfig} AppConfig
 */
/**
 * @typedef {Object} ModelConfig
 * @property {string} model
 * @property {number} inputTokenLimit
 * @property {number} outputTokenLimit
 * @property {number} rpm
 */

class Model {
    /**
     *
     * @param {App} app
     * @param {GenerativeAI} generativeAI
     * @param {{model: string, models: ModelConfig[], apikey: string}} modelConfig
     */
    constructor(app, generativeAI, modelConfig) {
        this.app = app;
        this.generativeAI = generativeAI;
        this.modelConfig = modelConfig;
        this.api = new GoogleGenerativeAI(modelConfig.apikey).getGenerativeModel({
            model: this.getModelConfig().model,
            safetySettings: this.getSafetySettings(),
            generationConfig: this.getGenerationConfig()

        }, {
            timeout: app.config.timeout
        });
    }

    getModelConfig() {
        return this.modelConfig.models[this.modelConfig.model];
    }

    async generateContent(prompts) {
        return await this.api.generateContent(prompts);
    }

    /**
     * @param {string} path
     * @param {MIME} mimeType
     * @returns {Promise<{inlineData: {data: string, mimeType: string}}>}
     */
    async imgToBase64(path, mimeType) {
        return {
            inlineData: {
                data: Buffer.from(await loadFile(path)).toString("base64"),
                mimeType
            }
        };
    }

    async imgsToBase64(imgs) {
        return await Promise.all(imgs.map(async (img) => {
            return await this.imgToBase64(img);
        }));
    }

    async countTokens(text) {
        return await this.api.countTokens(text);
    }

    /**
     * @param {string | import("@google/generative-ai").GenerateContentRequest | (string | import("@google/generative-ai").Part)[]} prompts
     * @returns {Promise<string|Rejected>}
     */
    async call(prompts) {
        return await this.tryExecute(async () => {
            return await (this.generativeAI.rpm.createTask(async () => {
                const result = await this.generateContent(prompts);
                const response = result.response;
                return response.text();
            })());
        });
    }

    async tryExecute(f, whenError = () => { }) {
        try {
            return await f();
        } catch (err) {
            whenError(err);
            this.app.Logger.error("Error occurred while calling GenerativeAI");
            this.app.Logger.error(err);
            return new Rejected(err.message);
        }
    }

    getSafetySettings() {
        return [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            }
        ];
    }

    getGenerationConfig() {
        return {
            temperature: 0.7,
            maxOutputTokens: this.getModelConfig().outputTokenLimit,
        };
    }
}

export class Chat {
    static defaultConfig = {
        name: "chat",
        id: 0,
        deleted: false
    };
    static Role = {
        USER: "user",
        MODEL: "model"
    };
    /**
     * @param {import("../types").App} app 
     * @param {Model} model 
     * @param {import("./chat.js").ChatApp} chatApp
     */
    constructor(app, model, chatApp, config = {}) {
        this.app = app;
        this.model = model;
        this.chatApp = chatApp;
        this.chat = null;
        this.history = [];
        this.config = {...Chat.defaultConfig, ...config};
    }

    /**
     * @param {import("../types").Chat} conversation 
     */
    start(conversation = {}) {
        /**@type {import("../types").Chat} */
        this.conversation = conversation;
        /**@type {import("../types").Message[]} */
        this.history = conversation.history || [];
        this.history.forEach(m => {
            this.chatApp.addHistory(m);
        });
        this.chat = this.model.api.startChat({
            history: this.history.map(v=>({role: v.user, parts: v.content})),
            generationConfig: this.model.getGenerationConfig()
        });
    }

    async send(message) {
        let result = await this.chat.sendMessage(message);
        let response = result.response.text();

        this.chatApp.addHistory({ user: Chat.Role.USER, content: message });
        this.chatApp.addHistory({ user: Chat.Role.MODEL, content: response });

        this.history = this.chatApp.toData();
        
        return response;
    }

    async sendStream(message, f) {
        if(!message || !message.length) return null;

        this.chatApp.addHistory({ user: Chat.Role.USER, content: message });
        this.chatApp.refresh();

        const result = await this.chat.sendMessageStream(message);

        let msg = this.chatApp.addHistory({ user: Chat.Role.MODEL, content: "" });

        let texts = [];
        for await (const chunk of result.stream) {
            let text = chunk.text();
            texts.push(text);
            msg.setContent(msg.getContent() + text);
            f(text);
        }

        this.history = this.chatApp.toData();

        return texts.join("");
    }

    getHistory() {
        return this.history;
    }

    toData() {
        return {
            name: this.config.name,
            id: this.config.id,
            history: this.chatApp.toData()
        };
    }
}

export class GenerativeAI {
    static GET_API_KEY = "https://makersuite.google.com/app/apikey";
    static defaultAiConfig = {
        apikeyPool: []
    };

    models = models;
    /** @type {Model} */
    api = null;
    /** @returns {Model} */
    getModelConfig() {
        return this.models[this.app.config.model];
    }

    /**
     * @constructor
     * @param {App} app
     */
    constructor(app, aiConfig = {}) {
        this.app = app;
        this.running = true;
        this.aiConfig = { ...GenerativeAI.defaultAiConfig, ...aiConfig };

        if (!this.aiConfig.apikeyPool.length) {
            throw new Error("No API key provided");
        }
        this.rpm = new RPM(this.getModelConfig().rpm * this.aiConfig.apikeyPool.length);

        this.init();
    }

    getAPI() {
        return this.api;
    }

    getAPIRotated() {
        return this.rotatePool().getAPI();
    }

    rotatePool() {
        if (this.api) this._pool.push(this.api);
        this.api = this._pool.shift();
        if (!this.api) {
            throw this.app.Logger.error(new Error("No API key available"));
        }
        return this;
    }

    init() {
        this._pool = [];
        this.aiConfig.apikeyPool.forEach(apikey => {
            this._pool.push(new Model(this.app, this, {
                model: this.app.config.model,
                models,
                apikey
            }));
        });
        this.rotatePool();
        return this;
    }

    exit() {
        this.rpm.exit();
        this.running = false;
    }
}
