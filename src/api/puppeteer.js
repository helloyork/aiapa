// import puppeteer from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

export class Browser {
    static EventTypes = {
        BEFORE_PAGE: "beforePage"
    };

    static Plugins = {
        StealthPlugin
    };

    static defaultSelectHanlder = (el) => el.textContent.trim();
    /** @type {import("puppeteer").Browser} */
    browser = null;
    constructor (app, config = {}) {
        this.app = app;
        this.closed = false;
        this.events = {
            beforePage: []
        };
        this.allowRecycle = false;
        this.maxFreePages = 5;
        this.freePages = [];
        this.puppeteerConfig = config;
    }

    async emit (event, ...args) {
        if (this.events[event]) {
            await Promise.all(this.events[event].map(func => func(...args)));
        }
    }

    /** @param {function(import("puppeteer").Page):Promise} func */
    onBeforePage (func) {
        this.events.beforePage.push(func);
        return this;
    }

    onDisconnect (func) {
        this.browser.on("disconnected", func);
        return this;
    }

    setAllowRecycle (allow) {
        this.allowRecycle = allow;
        return this;
    }

    setMaxFreePages (max) {
        this.maxFreePages = max;
        return this;
    }

    usePlugin (plugin) {
        puppeteer.use(plugin);
        return this;
    }

    async blockResources (page, types) {
        page.removeAllListeners("request");
        await page.setRequestInterception(true);
        page.on("request", (request) => {
            if (types.includes(request.resourceType())) {
                request.abort();
            } else {
                request.continue();
            }
        });
    }

    /** @param {import("puppeteer").PuppeteerLaunchOptions} options */
    async launch (options) {
        this.browser = await puppeteer.launch({ ...options, ...this.puppeteerConfig });
        return this.browser;
    }

    async tryExecute (func, onReject = async () => { }, ...args) {
        try {
            return await func(...args);
        } catch (error) {
            return await onReject(error);
        }
    }

    /**
     * Free a page, if allow page recycle, it will push the page to free pages, otherwise it will close the page
     * @param {import("puppeteer").Page} page
     */
    async free (page) {
        if (this.freePages.length < this.maxFreePages && this.allowRecycle) {
            this.freePages.push(page);
            await page.title("Free Page");
        } else {
            await page.close();
        }
    }

    /**
     * Get a page, if allow page recycle, it will return the first page in free pages
     * @param {function(import("puppeteer").Page):Promise} func
     * @param {function(import("puppeteer").Page):Promise} after
     * @param {boolean} recycle
     */
    async page (func, after, recycle = this.allowRecycle) {
        let page;
        if (recycle && this.freePages.length > 0) {
            page = this.freePages.shift();
        } else {
            page = await this.browser.newPage();
        }
        await this.emit(Browser.EventTypes.BEFORE_PAGE, page);
        const res = await func(page);
        if (after) await after(page);
        return res;
    }

    async close () {
        if (this.closed) return;
        this.closed = true;
        await this.browser?.close();
    }

    async scrowDown (page) {
        return await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
    }

    async try$Eval (page, { selector, evaluate }) {
        const ele = await page.$(selector);
        if (!ele || (Array.isArray(ele) && ele.length === 0)) return null;
        return await page.evaluate(evaluate || (Browser.defaultSelectHanlder), ele);
    }

    /**
     *
     * @param {import("puppeteer").ElementHandle} page
     * @param {import("../commands/get.js").ElementSelector} selector
     */
    async select (page, selector) {
        if (selector.querySelector) {
            if (Array.isArray(selector.querySelector)) {
                return await page.$$eval(selector.querySelector[0], selector.evaluate || Browser.defaultSelectHanlder);
            }
            return await page.$eval(selector.querySelector, selector.evaluate || Browser.defaultSelectHanlder);
        } else if (selector.querySelectors) {
            const res = {};
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
