import { StaticPage } from "../api/parsePage.js";
import { loadWeb } from "../api/dat.js";
import { askIfInvalid } from "../ui.js";


const AMAZON_SEARCH_URL = "https://www.amazon.com/s";
/**
 * @type {{[key: string]: {querySelector: string, evaluate?: (el: HTMLElement, page: StaticPage) => string}}}
 */
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
            return el.text().trim().replace(/bought in past month$/, "");
        }
    },
    star: {
        querySelector: "#acrPopover > span > a > span"
    },
    reviewNumber: {
        querySelector: "[data-hook=\"total-review-count\"]",
        evaluate: (el) => {
            return el.text().trim().replace(" global ratings", "");
        }
    },
};

/**@param {import("../cli.js").App} app */
export default async function main(app) {
    app.Logger.info("Start analyzing the page");
    const url = new URL(AMAZON_SEARCH_URL);
    url.append("k", await askIfInvalid(app.config.query, app.UI.input, "What do you want to search?"));
    const html = await loadWeb(url.toString(), {
        headers: {
            "User-Agent": await app.randomUserAgent()
        }
    });
    const page = new StaticPage(html);
    let result = [];
}

function getProducts(page) {
    // div[data-cy=title-recipe] > h2 > a
}

/**
 * @param {StaticPage} page 
 * @param {{querySelector: string, evaluate?: Function}} selector 
 */
function querySelect(page, selector) {
    let el = page.select(selector.querySelector);
    if (selector.evaluate) {
        return selector.evaluate(el, page);
    } else {
        return el.text().trim();
    }
}

