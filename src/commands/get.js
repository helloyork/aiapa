import path from "path";

import { Browser } from "../api/puppeteer.js";
import { TaskPool, randomInt, createProgressBar } from "../utils.js";
import { loadFile } from "../api/dat.js";

const AMAZON_SEARCH_URL = "https://www.amazon.com/s";
const config = {
    blockedResourceTypes: ["image", "font", "stylesheet"],
}
const Details = {
    title: {
        querySelector: "#productTitle"
    },
    price: {
        querySelector: "div.a-section > span.a-price > span"
    },
    sales: {
        querySelector: "#social-proofing-faceout-title-tk_bought > span",
        evaluate: (el) => {
            return el.textContent.trim().replace(/bought in past month$/, "");
        }
    },
    star: {
        querySelector: "#acrPopover > span > a > span"
    },
    reviewNumber: {
        querySelector: "[data-hook=\"total-review-count\"]",
        evaluate: (el) => {
            return el.textContent.trim().replace(" global ratings", "");
        }
    },
};

/**@param {import("../cli.js").App} app */
export default async function main(app) {
    let browser = new Browser(app), startTime = Date.now();

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
    app.Logger.info(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);


}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 */
async function search({ app, browser, page, search }) {
    if (!search && !search.length) {
        let res = await app.UI.input("Pleae type in query to search for:");
        if (!res || !res.length) throw new Error("No query provided, please provide by --query <string>");
        app.config.query = search = res;
    }
    let url = new URL(AMAZON_SEARCH_URL);
    url.searchParams.append("k", search);

    await page.goto(url.href, { timeout: app.config.timeOut });
    await page.waitForFunction(() => document.title.includes("Amazon.com"), { timeout: app.config.timeOut });

    let links = await page.evaluate(() => {
        let elements = document.querySelectorAll("div[data-cy=title-recipe] > h2 > a");
        return Array.from(elements).map((el) => el.href);
    });
    app.Logger.verbose(`Found ${links.length} links`);

    await page.close();

    let bar = createProgressBar();
    bar.start(app.config.maxTask, 0);

    let result = [], pool = new TaskPool(app.config.maxConcurrency, 1 * 1000).addTasks(
        links.slice(0, app.config.maxTask).map((link) => async () => {
            return await browser.page(async (page) => {
                await page.setRequestInterception(true);
                page.on("request", (req) => {
                    if(config.blockedResourceTypes.includes(req.resourceType())) req.abort();
                    else req.continue();
                });
                await page.goto(link, { timeout: app.config.timeOut }); // waitUntil: "networkidle2", 
                await page.waitForFunction(() => document.title.includes("Amazon.com"), { timeout: app.config.timeOut });
                // scroll to bottom
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });

                let res = await getDetails({ app, browser, page, search });
                result.push(res);

                await page.close();
                bar.increment(1);
            });
        }));
    await pool.start();
    bar.update(app.config.maxTask);
    bar.stop();
    app.Logger.verbose(JSON.stringify(result));
}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @param {import("cli-progress").SingleBar} bar
 */
async function getDetails({ page }) {
    let details = await Promise.all(Object.keys(Details).map(async (key) => {
        let element = await page.$(Details[key].querySelector);
        let value = element ? (await page.evaluate((el, evaluate) => evaluate ? evaluate(el) : el.textContent.trim(), element, Details[key]?.evaluate)) : "";
        await element.dispose();
        return { key, value };
    }));
    let output = {};
    details.forEach((detail) => {
        output[detail.key] = detail.value;
    });
    return output;
}
