
import { GoogleGenerativeAI } from "@google/generative-ai";

import models from "../dat/models.json"
import { loadFile } from "./dat.js";
import { Rejected } from "../utils.js";




/**
 * @typedef {import("../cli.js").App} App
 * @typedef {import("../cli.js").AppConfig} AppConfig
 */

class GenerativeAI {
    static GET_API_KEY = "https://makersuite.google.com/app/apikey";
    static defaultConfig = {
    };
    /**
     * @constructor
     * @param {App} app 
     */
    constructor(app) {
        this.app = app;
        this.init();
    }
    async tryExecute(f, whenError = ()=>{}) {
        try {
            return await f();
        } catch(err) {
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
    async imgToBase64(path, mimeType) {
        return {
            inlineData: {
                data: Buffer.from(await loadFile(path)).toString("base64"),
                mimeType
            }
        }
    }
    async call(prompts) {
        return await this.tryExecute(async () => {
            let result = await this.model.generateContent(prompts);
            let response = result.response;
            return response.text();
        });
    }
    init(){
        if(!models[this.app.config.model]) throw new Error(`Model ${this.app.config.model} not found`);
        this.api = new GoogleGenerativeAI(this.app.config.apiKey);
        this.model = this.api.getGenerativeModel(models[this.app.config.model]);
        return this;
    }
}

