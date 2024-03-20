
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
    HEIF: "image/heif",
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
                let result = await this.generateContent(prompts);
                let response = result.response;
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
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_NONE,
            },
        ];
    }
    getGenerationConfig() {
        return {
            temperature: 0.9,
            topP: 0.1,
            topK: 16,
        };
    }

}

export class GenerativeAI {
    static GET_API_KEY = "https://makersuite.google.com/app/apikey";
    static defaultAiConfig = {
        apikeyPool: [],
    };

    models = models;
    /**@type {Model} */
    api = null;
    /**@returns {Model} */
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

