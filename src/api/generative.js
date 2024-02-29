
import { GoogleGenerativeAI } from "@google/generative-ai";

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
 * @typedef {Object} Model
 * @property {string} model
 * @property {number} inputTokenLimit
 * @property {number} outputTokenLimit
 * @property {number} rpm
 */

export class GenerativeAI {
    static GET_API_KEY = "https://makersuite.google.com/app/apikey";
    static defaultAiConfig = {
    };

    models = models;
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
        this.init();
        this.running = true;
        this.aiConfig = { ...GenerativeAI.defaultAiConfig, ...aiConfig };
        this.rpm = new RPM(this.getModelConfig().rpm);
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
    async imgsToBase64(imgs) {
        return await Promise.all(imgs.map(async (img) => {
            return await this.imgToBase64(img);
        }));
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
    /**
     * @param {string | import("@google/generative-ai").GenerateContentRequest | (string | import("@google/generative-ai").Part)[]} prompts 
     * @returns {Promise<string|Rejected>}
     */
    async call(prompts) {
        if(!this.running) return new Rejected("GenerativeAI is exited.");
        return await this.tryExecute(async () => {
            return await (this.rpm.createTask(async () => {
                let result = await this.model.generateContent(prompts);
                let response = result.response;
                return response.text();
            })());
        });
    }
    async countTokens(text) {
        return await this.model.countTokens(text);
    }
    init() {
        if (!this.getModelConfig()) throw new Error(`Model ${this.app.config.model} not found`);
        this.api = new GoogleGenerativeAI(this.app.config.GEMINI_API_KEY || this.app.config.apiKey);
        this.model = this.api.getGenerativeModel(this.getModelConfig());
        return this;
    }
    exit() {
        this.rpm.exit();
        this.running = false;
    }
}

