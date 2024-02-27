
import { Browser } from "../api/puppeteer.js";
import { TaskPool, randomInt, createProgressBar, createMultiProgressBar } from "../utils.js";
import { loadFile, saveFile, joinPath } from "../api/dat.js";

const AMAZON_SEARCH_URL = "https://www.amazon.com/s";
const config = {
    blockedResourceTypes: ["image", "font", "stylesheet"],
};
/**
 * @typedef {Object} ElementSelector
 * @property {string|string[]} [querySelector]
 * @property {Object.<string, ElementSelector>} [querySelectors]
 * @property {function(Element|Object.<string, Element|Element[]>): any} [evaluate]
 */
/**@type {{[key: string]: string}}*/
const Selector = {
    title: "#productTitle",
    price: "#corePrice_feature_div span.a-price > span",
    sales: "#social-proofing-faceout-title-tk_bought > span",
    star: "#acrPopover > span > a > span",
    reviewNumber: "[data-hook=\"total-review-count\"]",
    totalRate:"[data-hook=\"rating-out-of-text\"]",
    productsReviewLink: "[data-hook=\"see-all-reviews-link-foot\"]",
    queryLinks: "div[data-cy=title-recipe] > h2 > a",
    reviews: "div[data-hook=\"review\"]",
    reviewTitle: "a[data-hook=\"review-title\"]",
    reviewStarRating: "i[data-hook=\"review-star-rating\"]",
    reviewDate: "span[data-hook=\"review-date\"]",
    reviewBody: "span[data-hook=\"review-body\"]",
    specificantionsSize: "#variation_size_name ul li",
    specificantionsStyle: "#variation_style_name ul li",
    specificantionsColor: "#variation_color_name ul li",
    specificantionsPattern: "#variation_pattern_name ul li",
};
/**@type {{[key: string]: ElementSelector}}*/
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
    specificantions: {
        querySelectors: {
            size: {
                querySelector: [Selector.specificantionsSize],
                evaluate: (els) => {
                    if (!els || (Array.isArray(els) && !els.length)) return [];
                    return Array.from(els).map((el) => el.textContent.replace(/\n/g, "")
                        .replace(" ".repeat(64), "\n").trim());
                }
            },
            style: {
                querySelector: [Selector.specificantionsStyle],
                evaluate: (els) => {
                    if (!els || (Array.isArray(els) && !els.length)) return [];
                    return Array.from(els).map((el) => {
                        let res = el.textContent.replace(/\n/g, "").trim();
                        if (el.querySelector("img")) {
                            let img = el.querySelector("img");
                            if (img.alt) res += `(${img.alt})`;
                            if (img.src) res += " " + img.src;
                        }
                        return res;
                    });
                }
            },
            pattern: {
                querySelector: [Selector.specificantionsPattern],
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
    },
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
    },
};

/**
 * @typedef {Object} Review
 * @property {string} title
 * @property {string} rating
 * @property {string} date
 * @property {string} content
 */
/**
 * @typedef {Object} Specificantions
 * @property {string[]} size
 * @property {string[]} style
 * @property {string[]} color
 * @property {string[]} pattern
 */
/**
 * @typedef {Object} ProductDetails
 * @property {string} href
 * @property {string} title
 * @property {string} price
 * @property {string} sales
 * @property {string} star
 * @property {Specificantions} specificantions
 * @property {number} reviewNumber
 * @property {string} productsReviewLink
 */
/**
 * @typedef {ProductDetails & {reviews: Review}} Product
 * @property {Review[]} reviews
 */

/**@param {import("../cli.js").App} app */
export default async function main(app) {
    let browser = new Browser(app), startTime = Date.now(), result;

    app.Logger.info("Launching browser");
    app.Logger.verbose("Import state: " + app.isImported);
    try {
        app.Logger.verbose("Loading user agents");
        const UAs = (await loadFile(app.App.getFilePath("./dat/user-agents.txt")))
            .split("\n")
            .map((ua) => ua.trim())
            .filter((ua) => ua.length > 0);
        app.Logger.verbose("User agents loaded");

        await browser.launch({ headless: !app.config.headful });
        app.Logger.log("Browser launched");

        browser.onBeforePage(async (page) => {
            await page.setUserAgent(UAs[randomInt(0, UAs.length - 1)]);
        });

        result = await browser.page(async (page) => {
            return await search({ browser, page, search: app.config.query, app, });
        });

        await browser.close();

        app.Logger.info("Saving to file...");
        let time = Date.now();

        if (!app.isImported) {
            let options = {
                "save as .json": async function (res) {
                    let path = await saveFile(joinPath(app.config.output, `${app.config.query}-result-${time}.json`), JSON.stringify(res));
                    app.Logger.log("Saved to file: " + path);
                },
                "log to console": (res) => app.Logger.log(JSON.stringify(res)),
                "none": () => { }
            };
            let res = await app.UI.select("Save files to: ", Object.keys(options));
            if (res) await options[res](result);
        }

        // let path = await saveCSV(app.config.output, `${app.config.query}-result-${time}`, convertToResult(result), {
        //     header: true
        // });
        // let jsonPath = await saveFile(joinPath(app.config.output, `${app.config.query}-result-${time}.json`), JSON.stringify(result));
        // app.Logger.log("Saved to file: " + path);
        // app.Logger.log("Saved to file: " + jsonPath);

    } catch (error) {
        app.Logger.error("An error occurred");
        app.Logger.error(error);
    }
    if (!browser.closed) {
        await browser.close();
        app.Logger.info("Browser closed");
    }

    app.Logger.log(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);

    return result;
}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @returns {Promise<Product[]>}
 */
export async function search({ app, browser, page, search }) {
    await browser.blockResources(page, config.blockedResourceTypes);
    if (!search && !search.length) {
        let res = await app.UI.input("Pleae type in query to search for:");
        if (!res || !res.length) throw new Error("No query provided, please provide by --query <string>");
        app.config.query = search = res;
    }
    let url = new URL(AMAZON_SEARCH_URL);
    url.searchParams.append("k", search);
    url.searchParams.append("s", "exact-aware-popularity-rank");
    url.searchParams.append("page", "1");

    let links = [], tried = 0;
    while (links.length < app.config.maxTask) {
        url.searchParams.set("page", ++tried);

        await page.goto(url.href, { timeout: app.config.timeOut });
        await page.waitForFunction(() => document.title.includes("Amazon.com"), { timeout: app.config.timeOut });

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

    await page.close();

    let bar = createProgressBar();
    bar.start(app.config.maxTask, 0);

    let products = [], pool = new TaskPool(app.config.maxConcurrency, 1).addTasks(
        links.slice(0, Number(app.config.maxTask)).map((link) => async () => {
            return await browser.page(async (page) => {
                await browser.blockResources(page, config.blockedResourceTypes);
                await page.goto(link, { timeout: app.config.timeOut }); // waitUntil: "networkidle2", 
                await page.waitForFunction(() => document.title.includes("Amazon.com"), { timeout: app.config.timeOut });

                await browser.scrowDown(page);

                let res = await getDetails({ app, browser, page, search });
                products.push(res);

                await page.close();
                bar.increment(1);
            });
        }));
    await pool.start();
    bar.stop();

    app.Logger.log(`Got ${products.length} products`);
    app.Logger.info("Running reviews search...");

    bar = createMultiProgressBar({
        format: "{bar} | {title} | {value}/{total}",
    });
    let result = await searchReviews({ app, browser, page, search }, bar, products);
    app.Logger.log(`Got ${result.map((r) => r.reviews.length).reduce((a, b) => a + b, 0)} reviews`);
    bar.stop();

    return result;

}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @param {import("cli-progress").SingleBar} bar
 * @returns {Promise<ProductDetails>}
 */
async function getDetails({ app, browser, page }) {
    let details = await Promise.all(Object.keys(Details).map(async (key) => {
        try {
            return {
                key,
                value: await browser.select(page, Details[key])
            };
        } catch (err) {
            app.Logger.warn("Failed to get details: " + key);
            app.Logger.warn(err);
            return {
                key,
                value: ""
            };
        }
    }));
    let output = {};
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
async function searchReviews({ app, browser, page, search }, bar, datas) {
    let result = [], pool = new TaskPool(app.config.maxConcurrency, 1).addTasks(datas.map((data) => async () => {
        result.push({
            ...data,
            reviews: await getReviews({ browser, page, app, search }, bar, data)
        });
    }));
    await pool.start();
    bar.stop();
    return result;
}

/**
 * @param {{browser: Browser, app: import("../cli.js").App, page: import("puppeteer").Page, search: string}} arg0
 * @param {import("cli-progress").MultiBar} bar
 * @param {ProductDetails} data
 * @returns {Promise<Review[]>}
 */
async function getReviews({ browser, app }, bar, data) {
    if (app.config.maxReviews > 10) {
        app.Logger.warn("Can't get more than 10 pages of reviews, setting to 10");
        app.config.maxReviews = 10;
    }
    if (app.config.maxReviews <= 0) {
        return [];
    }
    let childBar = bar.create(app.config.maxReviews, 0), pageUrl = new URL(data.productsReviewLink), currentPage = 1, reviews = [],
        maxTitleLength = 12, endStr = "...";
    await browser.page(async (page) => {
        await browser.blockResources(page, config.blockedResourceTypes);
        // each page may have 10 reviews, but we can't get more than 10 pages
        while (currentPage <= app.config.maxReviews) {
            if (currentPage > app.App.staticConfig.MAX_TRY) {
                throw new Error("Tried too many times when searching for reviews, max try: " + app.App.staticConfig.MAX_TRY + " reached.");
            }

            pageUrl.searchParams.set("pageNumber", currentPage);
            await page.goto(pageUrl.href, { timeout: app.config.timeOut });
            await page.waitForFunction(() => document.title.includes("Amazon.com"), { timeout: app.config.timeOut });
            await browser.scrowDown(page);

            let reviewsDiv = (await page.$$(Selector.reviews));
            if (!reviewsDiv.length) {
                break;
            }
            let reviewDatas = await Promise.all(reviewsDiv.map(async (review) => {
                let output = {};
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
            let txt = data.title.length > maxTitleLength ? data.title.slice(0, maxTitleLength - endStr.length) + endStr : data.title;
            childBar.increment(1, {
                title: txt,
            });
            currentPage++;
        }
    });
    return reviews;
}
