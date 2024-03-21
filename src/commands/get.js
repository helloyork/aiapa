/* eslint-disable indent */

import { Browser } from "../api/puppeteer.js";
import { TaskPool, randomInt, createProgressBar, createMultiProgressBar, sleep, isValidUrl, EventEmitter } from "../utils.js";
import { loadFile, saveFile, joinPath, saveCSV, splitByNewLine, formatDate, checkDirPermission } from "../api/dat.js";
import { Server } from "../api/server.js";

/**
 * @typedef {import("../types").Product} Product
 * @typedef {import("../types").ElementSelector} ElementSelector
 */

const AMAZON_SEARCH_URL = "https://www.amazon.com/s";
const config = {
    blockedResourceTypes: ["image", "font", "stylesheet"],
    proxies: [],
    skipSave: false
};

export const EventTypes = {
    BEFORE_COMMAND_RUN: "beforeCommandRun",
    AFTER_COMMAND_RUN: "afterCommandRun"
};
export const events = new EventEmitter();

const Selector = {
    title: "#productTitle",
    price: "#corePrice_feature_div span.a-price > span",
    sales: "#social-proofing-faceout-title-tk_bought > span",
    star: "#acrPopover > span > a > span",
    reviewNumber: "[data-hook=\"total-review-count\"]",
    totalRate: "[data-hook=\"rating-out-of-text\"]",
    productsReviewLink: "[data-hook=\"see-all-reviews-link-foot\"]",
    queryLinks: "div[data-cy=title-recipe] > h2 > a",
    reviews: "div[data-hook=\"review\"]",
    reviewTitle: "a[data-hook=\"review-title\"]",
    reviewStarRating: "i[data-hook=\"review-star-rating\"]",
    reviewDate: "span[data-hook=\"review-date\"]",
    reviewBody: "span[data-hook=\"review-body\"]",
    specificationsSize: "#variation_size_name ul li",
    specificationsStyle: "#variation_style_name ul li",
    specificationsColor: "#variation_color_name ul li",
    specificationsPattern: "#variation_pattern_name ul li",
    nextPageButton: "#cm_cr-pagination_bar li.a-last > a"
};
/** @type {{[key: string]: ElementSelector}} */
const Details = {
    href: {
        evaluate: () => {
            return location.href;
        }
    },
    title: {
        querySelector: Selector.title
    },
    price: {
        querySelector: Selector.price,
        evaluate: (el) => {
            if (!el) return "";
            return el.textContent.trim() + (document.querySelectorAll("#corePrice_desktop .aok-relative")[0]?.textContent.trim() || "");
        }
    },
    sales: {
        querySelector: Selector.sales,
        evaluate: (el) => {
            if (!el) return "";
            return el.textContent.trim();
        }
    },
    specifications: {
        querySelectors: {
            size: {
                querySelector: [Selector.specificationsSize],
                evaluate: (els) => {
                    if (!els || (Array.isArray(els) && !els.length)) return [];
                    return Array.from(els).map((el) => el.textContent.replace(/\n/g, "")
                        .replace(" ".repeat(64), "\n").trim());
                }
            },
            style: {
                querySelector: [Selector.specificationsStyle],
                evaluate: (els) => {
                    if (!els || (Array.isArray(els) && !els.length)) return [];
                    return Array.from(els).map((el) => {
                        let res = el.textContent.replace(/\n/g, "").trim();
                        if (el.querySelector("img")) {
                            const img = el.querySelector("img");
                            if (img.alt) res += `(${img.alt})`;
                            if (img.src) res += " " + img.src;
                        }
                        return res;
                    });
                }
            },
            pattern: {
                querySelector: [Selector.specificationsPattern],
                evaluate: (els) => {
                    if (!els || (Array.isArray(els) && !els.length)) return [];
                    return Array.from(els).map((el) => el.textContent.replace(" ".repeat(32), "").trim());
                }
            }
        },
        evaluate: ({ size, style, pattern }) => {
            return {
                size, style, pattern
            };
        }
    },
    star: {
        querySelector: Selector.totalRate,
        evaluate: (el) => {
            return parseFloat(el.textContent.trim()) || el.textContent.trim();
        }
    },
    reviewNumber: {
        querySelector: Selector.reviewNumber,
        evaluate: (el) => {
            return parseInt(el.textContent.trim().replace(",", ""));
        }
    },
    productsReviewLink: {
        querySelector: Selector.productsReviewLink,
        evaluate: (el) => {
            return el.href;
        }
    }
};
const ReviewSelectors = {
    title: {
        querySelector: Selector.reviewTitle,
        evaluate: (el) => {
            return el.textContent.split("\n".repeat(8) + "  \n  \n    ").slice(1).join("").trim();
        }
    },
    rating: {
        querySelector: Selector.reviewStarRating,
        evaluate: (el) => {
            return parseFloat(el.textContent.trim()) || el.textContent.trim();
        }
    },
    date: {
        querySelector: Selector.reviewDate
    },
    content: {
        querySelector: Selector.reviewBody,
        evaluate: (el) => {
            return el.textContent.split("\n".repeat(8) + "  \n  \n    ").slice(1).join("").trim();
        }
    }
};

/**
 * register a selector to be used for getting details
 * @param {string} key
 * @param {ElementSelector} selector
 */
export function registerDetailSelector (key, selector) {
    Details[key] = selector;
}

/**
 * register a function to be used for evaluating a selector
 * evaluate function will be called after the selector is selected
 * @example
 * app.on("beforeCommandRun", (cmd, mod) => {
 *     mod.registerDetailSelector("links", {
 *         querySelector: "a",
 *         evaluate: (el) => el.href
 *     });
 * }).run(Commands.get);
 * @param {string} key
 * @param {function(Element|Object.<string, Element|Element[]>): any} evaluate
 */
export function registerEvaluation (key, evaluate) {
    Details[key].evaluate = evaluate;
}

/**
 * register a proxy to be used for requests
 * @example
 * app.on("beforeCommandRun", (cmd, mod) => {
 *    mod.registerProxy(["http://127.0.0.1:8081", // some proxies
 *    ]);
 * });
 * @param {string[]|string} proxy
 * @returns {string[]}
 */
export function registerProxy (proxy) {
    if (Array.isArray(proxy)) config.proxies.push(...proxy);
    else config.proxies.push(proxy);
    return [...config.proxies];
}

export function registerBlockedResourceTypes (types) {
    config.blockedResourceTypes.push(...types);
    return [...config.blockedResourceTypes];
}

export function getConfig () {
    return config;
}

/** @param {import("../types").App} app */
export default async function main (app) {
    events.emit(EventTypes.BEFORE_COMMAND_RUN, app);
    app.config.debug && app.Logger.debug("Debug mode enabled, Image will be loaded");

    if (!checkDirPermission(app.config.binPath)) {
        app.Logger.error("No permission to write to: " + app.config.binPath + ", please check your permission");
        return;
    }

    const server = new Server(app);
    const browser = setupBrowser(app, server);
    const startTime = Date.now(); let result;

    app.Logger.verbose("Launching browser");
    app.Logger.verbose("Import state: " + app.isImported);

    try {
        const UAs = splitByNewLine(await loadFile(app.App.getFilePath(app.App.staticConfig.USER_AGENTS_PATH)));
        app.Logger.verbose("User agents loaded");

        setupServer(app, server, config);

        await browser.launch({ headless: !app.config.headful });
        app.Logger.info("Browser launched");

        setupBrowserEvents(app, browser, UAs);

        result = await browser.page(async (page) => {
            return await search({ browser, page, search: app.config.query, app });
        });
        await browser.close();

        if (!result) throw new Error("No result found");

        const time = formatDate(new Date());

        const path = await ((!app.isImported && !config.skipSave) ? saveResults(app, result, time) : saveFile(getPath(app, time, ".json"), JSON.stringify(result)));
        app.Logger.log(`Saved to: ${app.UI.hex(app.UI.Colors.Blue)(path)}`);
        events.emit(EventTypes.AFTER_COMMAND_RUN, app, path, result);
    } catch (error) {
        app.Logger.error("An error occurred");
        app.Logger.error(error);
    } finally {
        await browser.close();
        await server.close();
    }

    app.Logger.log(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);

    return result;
}

function setupBrowser (app, server) {
    const browser = new Browser(app, { args: [...(app.config.proxy ? [`--proxy-server=${"http://localhost:" + server.port}`] : [])] })
        .setAllowRecycle(true).setMaxFreePages(app.config.maxConcurrency < 10 ? 10 : app.config.maxConcurrency);
    browser.usePlugin(Browser.Plugins.StealthPlugin());
    return browser;
}

function setupServer (app, server, config) {
    if (app.config.proxy) {
        if (config.proxies.length > 0) server.addProxis(config.proxies);
        server.init(8080);
    }
}

function setupBrowserEvents (app, browser, UAs) {
    browser.onBeforePage(async (page) => {
        await page.setUserAgent(UAs[randomInt(0, UAs.length - 1)]);
    }).onDisconnect(() => {
        if (browser.closed) return;
        throw app.Logger.error(new Error("Browser disconnected"));
    });
}

async function saveResults (app, result, time) {
    const options = getSaveOptions(app, time);
    const res = await app.UI.select("Save files to: ", Object.keys(options));
    if (res) return await options[res](result);
}

function getSaveOptions (app, time) {
    return {
        "save as .json": async function (res) {
            return await saveFile(getPath(app, time, ".json"), JSON.stringify(res));
        },
        "save as .csv": async function (res) {
            return await saveCSV(app.config.output, getPath(app, time, ".csv"), formatOutput(res));
        },
        "log to console": (res) => app.Logger.log(JSON.stringify(res)),
        none: () => { }
    };
}

function getPath (app, time, ext) {
    const title = getTitle(app);
    return joinPath(app.config.output, `${title}-result-${time}${ext}`);
}

function getTitle (app) {
    if (isValidUrl(app.config.query) && new URL(app.config.query).hostname === new URL(AMAZON_SEARCH_URL).hostname) {
        return new URL(app.config.query).pathname.split("/").filter(Boolean)[0];
    }
    return app.config.query;
}

function formatOutput (res) {
    return res.map(r => {
        const o = {};
        Object.entries(r).forEach(([key, value]) => {
            o[key] = typeof value === "string" ? value : JSON.stringify(value);
        });
        return o;
    });
}

async function getProductLinks ({ app, browser, page, search }) {
    const url = new URL(AMAZON_SEARCH_URL);
    url.searchParams.append("k", search);
    url.searchParams.append("s", "exact-aware-popularity-rank");
    url.searchParams.append("page", "1");

    let links = []; let tried = 0;
    while (links.length < app.config.maxTask) {
        url.searchParams.set("page", ++tried);

        await page.goto(url.href, { timeout: app.config.timeOut });
        await page.waitForFunction(() => document.title.includes("Amazon.com") || document.title.includes("Sorry!"), { timeout: app.config.timeOut });

        if ((await page.title()).includes("Sorry!")) throw new Error("Access denied when searching for links: " + new URL(page.url()).pathname);

        await browser.scrowDown(page);
        if (tried > app.App.staticConfig.MAX_TRY) {
            throw new Error("Tried too many times when searching for links, max try: " + app.App.staticConfig.MAX_TRY + " reached.");
        }

        links = [...links, ...new Set(await Promise.all(
            (await page.$$(Selector.queryLinks))
                .map(async (el) => {
                    return el.evaluate(node => node.href);
                })
        ))];

        app.Logger.verbose(`Found ${links.length} links`);
    }

    return links;
}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @returns {Promise<Product[]>}
 */
async function search ({ app, browser, page, search }) {
    if (!app.config.debug) await browser.blockResources(page, config.blockedResourceTypes);
    if (!search && !search.length) {
        const res = await app.UI.input("Pleae type in query to search for (or a product link):");
        if (!res || !res.length) throw new Error("No query provided, please provide by --query <string>");
        app.config.query = search = res;
    }
    if (app.config.lowRam && app.config.maxConcurrency > 3) {
        app.Logger.warn("Max Concurrecy is set to 3 because of low ram mode");
        app.config.maxConcurrency = 5;
    }

    const links = isValidUrl(search) ? [search] : await getProductLinks({ app, browser, page, search });

    await browser.free(page);

    let bar = createProgressBar();
    bar.start(app.config.maxTask, 0);

    const products = []; const pool = new TaskPool(app.config.maxConcurrency, app.config.lowRam ? app.App.staticConfig.DELAY_BETWEEN_TASK : 0).addTasks(
        links.slice(0, Number(app.config.maxTask)).map((link) => async () => {
            return await browser.page(async (page) => {
                if (!app.config.debug) await browser.blockResources(page, config.blockedResourceTypes);
                await page.goto(link, { timeout: app.config.timeOut });
                await page.waitForSelector(Selector.title, { timeout: app.config.timeOut });
                // await page.waitForFunction(() => document.title.includes("Amazon.com"), { timeout: app.config.timeOut });

                await browser.scrowDown(page);

                const res = await getDetails({ app, browser, page, search });
                products.push(res);

                await browser.free(page);
                bar.increment(1);
            });
        }));
    await pool.start();
    bar.stop();

    app.Logger.log(`Got ${products.length} products`);

    if (app.config.lowRam) await sleep(app.App.staticConfig.DELAY_BETWEEN_TASK);

    app.Logger.info("Running reviews search...");

    bar = createMultiProgressBar({
        format: "{bar} | {title} | {value}/{total}"
    });
    const result = await searchReviews({ app, browser, page, search }, bar, products);
        const reviewNumber = result.reduce((acc, cur) => acc + Object.values(cur.reviews).map(v => v.length).reduce((a, b) => a + b, 0), 0);
    app.Logger.log(`Got ${reviewNumber} reviews`);
    bar.stop();

    return result;
}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @param {import("cli-progress").SingleBar} bar
 * @returns {Promise<ProductDetails>}
 */
async function getDetails ({ app, browser, page }) {
    const details = await Promise.all(Object.keys(Details).map(async (key) => {
        try {
            return {
                key,
                value: await browser.select(page, Details[key])
            };
        } catch (err) {
            app.Logger.warn("Failed to get details: " + key + " on page: " + page.url());
            app.Logger.warn(err);
            return {
                key,
                value: ""
            };
        }
    }));
    const output = {};
    details.forEach((detail) => {
        output[detail.key] = detail.value;
    });
    return output;
}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @param {import("cli-progress").MultiBar} bar
 * @param {ProductDetails[]} datas
 * @returns {Promise<Product[]>}
 */
async function searchReviews ({ app, browser }, bar, datas) {
    const result = []; const pool = new TaskPool(app.config.maxConcurrency, app.config.lowRam ? app.App.staticConfig.DELAY_BETWEEN_TASK : 0).addTasks(datas.map((data) => async () => {
        try {
            result.push({
                ...data,
                reviews: {
                    positive: await getReviews({ browser, app }, { bar, data, sort: "positive" }),
                    critical: await getReviews({ browser, app }, { bar, data, sort: "critical" })
                }
            });
        } catch (err) {
            console.error(err);
        }
    }));
    await pool.start();
    bar.stop();
    return result;
}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @param {{bar: import("cli-progress").MultiBar, data: ProductDetails, sort: "positive"|"critical"}} arg1
 * @returns {Promise<Review[]>}
 */
async function getReviews ({ browser, app }, { data, sort = "positive" }) {
    if (app.config.maxReviews > 10) {
        app.Logger.warn("Can't get more than 10 pages of reviews, setting to 10");
        app.config.maxReviews = 10;
    }
    if (app.config.maxReviews <= 0) {
        return [];
    }
    const url = new URL(data.productsReviewLink);
    url.searchParams.set("filterByStar", sort);
    let pageUrl = url.href; const reviews = [];
        const maxTitleLength = 16; const endStr = "..."; const txt = data.title.length > maxTitleLength ? data.title.slice(0, maxTitleLength - endStr.length) + endStr : data.title;
    await browser.page(async (page) => {
        let tried = 0;
        if (!app.config.debug) await browser.blockResources(page, config.blockedResourceTypes);

        // each page may have 10 reviews, but we can't get more than 10 pages
        try {
            while (tried < app.config.maxReviews) {
                if (tried > app.App.staticConfig.MAX_TRY) {
                    throw new Error("Tried too many times when searching for reviews, max try: " + app.App.staticConfig.MAX_TRY + " reached.");
                }

                await page.goto(pageUrl, { timeout: app.config.timeOut });
                await page.waitForFunction(() => ((document.title.includes("Amazon.com") || document.title.includes("Sign-In"))), { timeout: app.config.timeOut });

                if (page.url().includes("amazon.com/ap/signin")) {
                    app.Logger.error("Access denied when getting reviews: " + new URL(page.url()).pathname);
                    break;
                }

                await browser.scrowDown(page);

                const reviewsDiv = (await page.$$(Selector.reviews));
                if (!reviewsDiv.length) {
                    break;
                }
                const reviewDatas = await Promise.all(reviewsDiv.map(async (review) => {
                    const output = {};
                    await Promise.all(Object.keys(ReviewSelectors).map(async (key) => {
                        try {
                            output[key] = await browser.select(review, ReviewSelectors[key]);
                        } catch (err) {
                            app.Logger.warn("Failed to get review details: " + key);
                            app.Logger.warn(err);
                            output[key] = "";
                        }
                    }));
                    return output;
                }));
                reviews.push(...reviewDatas);
                tried++;

                const nextPageLink = await browser.try$Eval(page, { selector: Selector.nextPageButton, evaluate: (el) => el.href });
                if (!nextPageLink) break;
                pageUrl = nextPageLink;
            }
        } catch (err) {
            app.Logger.error(err);
        } finally {
            app.Logger.info(`Got ${reviews.length} reviews for ${txt}(${sort})`);
            await browser.free(page);
        }
    });
    return reviews;
}
