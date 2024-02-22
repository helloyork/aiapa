import puppeteer from "puppeteer";

import { Rejected } from "../utils.js";

export class Browser {
    static EventTypes = {
        BEFORE_PAGE: "beforePage",
    };
    /**@type {import("puppeteer").Browser} */
    browser = null;
    constructor(app) {
        this.app = app;
        this.events = {
            beforePage: []
        };
    }
    async emit(event, ...args) {
        if(this.events[event]) {
            await Promise.all(this.events[event].map(func => func(...args)));
        }
    }
    /**@param {function(import("puppeteer").Page):Promise} func */
    onBeforePage(func) {
        this.events.beforePage.push(func);
        return this;
    }
    /**@param {import("puppeteer").PuppeteerLaunchOptions} options */
    async launch(options) {
        this.browser = await puppeteer.launch(options);
        return this.browser;
    }
    async tryExecute(func, ...args) {
        try {
            return await func(...args);
        } catch (error) {
            this.app.Logger.error(error);
            return new Rejected(error);
        }
    }
    /**
     * @param {function(import("puppeteer").Page):Promise} func
     * @returns {Promise<import("puppeteer").Page>}
     */
    async page(func) {
        const page = await this.browser.newPage();
        await this.emit(Browser.EventTypes.BEFORE_PAGE, page);
        await func(page);
        return page;
    }
    async close() {
        await this.browser.close();
    }
}


