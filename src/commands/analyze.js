import path from "path";

import { Browser } from "../api/puppeteer.js";
import { TaskPool, randomInt, createProgressBar } from "../utils.js";
import { loadFile } from "../api/dat.js";

const AMAZON_SEARCH_URL = "https://www.amazon.com/s";
const Details = {
    title: "#productTitle",
    price: "div.a-section > span.a-price > span",
    sales: "#social-proofing-faceout-title-tk_bought > span",
    star: "#acrPopover > span > a > span"
};

/**@param {import("../cli.js").App} app */
export default async function main(app) {
    let browser = new Browser(app);

    app.Logger.info("Launching browser");
    try {
        app.Logger.verbose("Loading user agents");
        const UAs = (await loadFile(path.join(process.cwd(), "src/dat/user-agents.txt")))
            .split("\n")
            .map((ua) => ua.trim())
            .filter((ua) => ua.length > 0);
        app.Logger.verbose("User agents loaded");

        await browser.launch({ headless: !app.config.headful });
        app.Logger.info("Browser launched");

        browser.onBeforePage(async (page) => {
            await page.setUserAgent(UAs[randomInt(0, UAs.length - 1)]);
        });

        await browser.page(async (page) => {
            return await search({ browser, page, search: app.config.query, app, });
        });
    } catch (error) {
        app.Logger.error("An error occurred");
        app.Logger.error(error);
    } finally {
        await browser.close();
        app.Logger.info("Browser closed");
    }


}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 */
async function search({ app, browser, page, search }) {
    if (!search && !search.length) {
        let res = await app.UI.input("Pleae type in query to search for:");
        if (!res) return;
        app.config.query = search = res;
    }
    let url = new URL(AMAZON_SEARCH_URL);
    url.searchParams.append("k", search);

    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: app.config.timeOut });

    let links = await page.evaluate(() => {
        let elements = document.querySelectorAll("div[data-cy=title-recipe] > h2 > a");
        return Array.from(elements).map((el) => el.href);
    });

    let bar = createProgressBar();
    bar.start(app.config.maxTask, 0);

    let result = [], pool = new TaskPool(app.config.maxConcurrency, 3 * 1000).addTasks(
        links.slice(0, app.config.maxTask).map((link) => async () => {
            return await browser.page(async (page) => {
                await page.goto(link, { waitUntil: "domcontentloaded", timeout: app.config.timeOut });
                let res = await getDetails({ app, browser, page, search });
                result.push(res);
                await page.close();
                bar.increment(1);
            });
        }));
    await pool.start();
    bar.stop();
    app.Logger.log(result);

}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @param {import("cli-progress").SingleBar} bar
 */
async function getDetails({ app, page }) {
    // "Getting details on "+ new URL(page.url()).pathname
    return await page.evaluate((Details, app) => {
        app.Logger.verbose("Evaluating details");
        let out = {};
        Object.keys(Details).forEach((key) => {
            let el = page.$(Details[key]);
            if (el) {
                out[key] = el.textContent.trim();
                app.Logger.debug(`Got ${key}: ${out[key]}`);
            }
        });
        app.Logger.verbose(JSON.stringify(out));
        return out;
    }, Details, app);
}
