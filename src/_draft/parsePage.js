import * as cheerio from "cheerio";

export class StaticPage {
    constructor(html) {
        this.$ = cheerio.load(html);
    }
    select(selector) {
        return this.$(selector);
    }
}

