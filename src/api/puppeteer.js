import puppeteer from "puppeteer";


export class Browser {
    static EventTypes = {
        BEFORE_PAGE: "beforePage",
    };
    static defaultSelectHanlder = (el) => el.textContent.trim();
    /**@type {import("puppeteer").Browser} */
    browser = null;
    constructor(app) {
        this.app = app;
        this.closed = false;
        this.events = {
            beforePage: []
        };
    }
    async emit(event, ...args) {
        if (this.events[event]) {
            await Promise.all(this.events[event].map(func => func(...args)));
        }
    }
    /**@param {function(import("puppeteer").Page):Promise} func */
    onBeforePage(func) {
        this.events.beforePage.push(func);
        return this;
    }
    async blockResources(page, types) {
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            if (types.includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });
    }
    /**@param {import("puppeteer").PuppeteerLaunchOptions} options */
    async launch(options) {
        this.browser = await puppeteer.launch(options);
        return this.browser;
    }
    async tryExecute(func, onReject = async () => { }, ...args) {
        try {
            return await func(...args);
        } catch (error) {
            return await onReject(error);
        }
    }
    /**
     * @param {function(import("puppeteer").Page):Promise} func
     */
    async page(func) {
        const page = await this.browser.newPage();
        await this.emit(Browser.EventTypes.BEFORE_PAGE, page);
        return await func(page);
    }
    async close() {
        if (this.closed) return;
        this.closed = true;
        await this.browser.close();
    }
    async scrowDown(page) {
        return await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
    }
    /**
     * 
     * @param {import("puppeteer").ElementHandle} page 
     * @param {import("../commands/get.js").ElementSelector} selector 
     */
    async select(page, selector) {
        if (selector.querySelector) {
            if (Array.isArray(selector.querySelector)) {
                return await page.$$eval(selector.querySelector[0], selector.evaluate || Browser.defaultSelectHanlder);
            }
            return await page.$eval(selector.querySelector, selector.evaluate || Browser.defaultSelectHanlder);
        } else if (selector.querySelectors) {
            let res = {};
            await Promise.all(Object.keys(selector.querySelectors).map(async key => {
                res[key] = await this.select(page, selector.querySelectors[key]);
            }));
            await page.evaluate(selector.evaluate || ((el) => el[0].textContent.trim()), res);
            return res;
        } else if (selector.evaluate) {
            return await page.evaluate(selector.evaluate || Browser.defaultSelectHanlder);
        }
    }
}


