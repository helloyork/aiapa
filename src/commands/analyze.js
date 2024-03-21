
import { GenerativeAI } from "../api/generative.js";
import { getFilesToObj, readJSON, saveFile, resolve, formatDate, createDirIfNotExists } from "../api/dat.js";
import { TfIdfAnalyze } from "../api/natural.js";
import { TaskPool } from "../utils.js";
import { renderTemplate } from "../api/page.js";

import path from "path";
import open, { apps } from "open";

const settings = {
    MAX_PROMPT_LINES: 300,
    MAX_REVIEW_PER_PRODUCT: 8,
    prompts: ["summarize these product reviews and give me its ", ", return as json format, no markdown, no extra characters, must be short, return as json, no markdown: {\"data\": {[key: reason]: short summary}}, 6~7 row\ndata:\nSTART\n", "\nEND\nsummarize these product reviews and give me its"," ,return as json format, no markdown, no extra characters, return as json: {\"data\": {[key: reason]: short summary}}"],
    prompts2: ["Given product information, provide a final summary of the product containing:\n**Basic Product Description**:\n<Basic Product Description>\n**Summary of Product Strengths**:\n<Summary of Product Strengths>\n**Summary of Product Weaknesses**:\n<Summary of Product Weakness as many as possible>\n\nThe following is the product information:\nSTART\n", "\nEND\n"],
    skipFileChoose: false,
    file: null,
    templateName: "result-template",
};


const adapt = {
    get(m) {
        try {
            return JSON.parse(m);
        } catch (err) {
            return;
        }
    },
    /**
     * @param {import("../types").SummarizedProduct} data
     * @return {{critical: {[key: string]: string}[], positive: {[key: string]: string}[]}}
     */
    summary(data) {
        try {
            let output = {};
            ["critical", "positive"].forEach((key) => {
                output[key] = data.summary[key].map((v) => v.data);
            });
            return output;
        } catch (err) {
            return {};
        }
    },
    /**
     * @param {import("../types").SummarizedProduct} product
     */
    productify(product) {
        let specifications = (Object.keys(product.specifications)).filter(v => product.specifications[v].length).map((v) => `${v}: ${product.specifications[v].join(",")}`).join("\n");
        let data = `title: ${product.title}\nstars: ${product.star}\nprice: ${product.price}\nreview number: ${product.reviewNumber}\nspecifications:${specifications}\nsales:${product.sales}\nsummary: ${JSON.stringify(adapt.summary(product))}`;
        return data;
    }
};


/**@param {import("../types").App} app */
export default async function main(app) {
    if (!app.config.GEMINI_API_KEY && !app.config.apiKey.length) {
        app.Logger.warn(`You don't have an api key yet, Get your API key from ${app.UI.hex(app.UI.Colors.Blue)(GenerativeAI.GET_API_KEY)}`);
        app.exit(app.App.exitCode.OK);
    }

    let file = settings.skipFileChoose ? settings.file : await chooseFile({ app });
    if (!file) {
        throw app.Logger.error(new Error("file is required"));
    }

    app.config.file = file;
    app.Logger.info(`file: ${app.UI.hex(app.UI.Colors.Blue)(file)}`);
    const ai = new GenerativeAI(app, {
        apikeyPool: [...(app.config.GEMINI_API_KEY ? [app.config.GEMINI_API_KEY] : []), ...(app.config.apiKey ? [...app.config.apiKey] : [])]
    });

    try {
        let time = Date.now();
        /**@type {import("../types").Product[]} */
        let data = await readJSON(app.config.file);

        let results = await summarize({ app, ai }, data);
        let name = `summarized-${formatDate(new Date())}-${path.basename(app.config.file)}.json`;
        app.Logger.log(`saved to ${app.UI.hex(app.UI.Colors.Blue)(await saveFile(resolve(app.config.output,name), JSON.stringify(results)))}`);

        let _path = await saveRenderable({ app }, results);
        open(_path, {
            app: {
                name: apps.browser
            }
        });

        app.Logger.info(`Time taken: ${Date.now() - time}ms`);

        return results;
    } catch (err) {
        throw app.Logger.error(err);
    } finally {
        ai.exit();
    }
}


export function getConfig() {
    return settings;
}

/**@param {{app: import("../types").App}} app */
async function chooseFile({ app }) {
    let file = app.config.file;
    if (!file) {
        let otherPromt = "OTHER (enter file path).";
        await createDirIfNotExists(app.config.output);
        let files = await getFilesToObj(app.App.getFilePath(app.config.binPath));
        let quetions = [...Object.keys(files).filter(v => v.endsWith(".json")), app.UI.separator(), otherPromt, app.UI.separator()];
        let res = await app.UI.select("select a file as input", quetions);
        file = res === otherPromt ? await app.UI.input("enter file path:") : files[res];
    }
    return file;
}


/**
 * @param {import("../types").ConcludedProduct[]} datas
 * @returns {import("../types").RenderableData}
 */
function getRenderable(datas) {
    return {
        products: datas.map((v) => {
            let hrefU = new URL(v.href), stars = Math.ceil(parseInt(v.star));
            return {
                name: v.title,
                href: hrefU.origin + hrefU.pathname,
                stars: stars ? (`(${v.star}) ` + "⭐".repeat(stars) + "☆".repeat(5 - stars)) : "N/A",
                reviewNumber: v.reviewNumber,
                sales: v.sales,
                description: v.conclusion,
                attributes: [{
                    name: "review link",
                    value: v.productsReviewLink
                }, ...(Object.keys(v.specifications)).filter(k => v.specifications[k].length).map((key) => {
                    return {
                        name: key,
                        value: v.specifications[key].join(", ")
                    };
                })],
            };
        })
    };
}

/**
 * @param {{app: import("../types").App}} param0 
 * @param {import("../types").ConcludedProduct[]} datas
 * @returns {Promise<string>}
 */
async function saveRenderable({ app }, datas) {
    let out = getRenderable(datas);
    let result = renderTemplate({ app }, settings.templateName, out);
    let file = resolve(app.config.output, `result-${formatDate(new Date())}-${path.basename(app.config.file)}.html`);
    let _path = await saveFile(file, result);
    app.Logger.log(`saved results to ${app.UI.hex(app.UI.Colors.Blue)(file)}`);
    return _path;
}

function getSortedSentences(sentences, max = settings.MAX_REVIEW_PER_PRODUCT) {
    let tfidf = new TfIdfAnalyze();
    tfidf.addDocuments(sentences);
    return tfidf.getParagraphSentenceScores().map((item) => item.sort((a, b) => b.score - a.score).slice(0, max).map(v => v.sentence));
}

function insertPrompt(prompts, data) {
    let res = prompts[0];
    for (let i = 0; i < data.length; i++) {
        res += (data[i] || "") + (prompts[i + 1] || "");
    }
    return res;
}

function splitArray(arr, size) {
    let res = [];
    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size));
    }
    return res;
}

/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} app
 * @param {import("../types").SummarizedProduct} product
 * @returns {Promise<string>}
 */
async function concludeProduct({ ai }, product) {
    let result = await ai.getAPIRotated().call(insertPrompt(settings.prompts2, [adapt.productify(product)]));
    return result;
}

/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} app
 * @param {import("../types").SummarizedProduct[]} data
 * @returns {Promise<import("../types").ConcludedProduct[]>}
 */
async function summarize({ app, ai }, data) {
    const reviews = [];
    await Promise.all(data.map(async (product) => {
        let res = await summarizeProduct({ app, ai }, product);
        if (res) {
            reviews.push(res);
        }
    }));
    return reviews;
}

/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} app
 * @param {string[]} reviews
 * @param {"critical"|"benefits"} side
 * @returns {Promise<import("../types").Summary[]>}
 */
async function callSummarize({ app, ai }, reviews, side) {
    let sentences = getSortedSentences(reviews);
    let prompts = splitArray(sentences, settings.MAX_PROMPT_LINES).map((v) => insertPrompt(settings.prompts, [side, v.join("\n"), side]));
    let results = [];
    let taskPool = new TaskPool(app.config.maxConcurrency, app.App.staticConfig.DELAY_BETWEEN_TASK).addTasks(
        prompts.map((v) => async function run(tried = 0) {
            try {
                let result = await ai.getAPIRotated().call(v);
                let parsed = adapt.get(result);
                if (parsed) {
                    if (tried == 0) results.push(parsed);
                    else return parsed;
                } else {
                    app.Logger.warn("failed to parse result: " + result)
                        .warn("retry: " + (++tried));
                    if (tried >= app.App.staticConfig.MAX_TRY) throw new Error("max try " + app.App.staticConfig.MAX_TRY + " reached");
                    if (tried == 0) results.push(await run(tried));
                    else return await run(tried);
                }
            } catch (err) {
                app.Logger.error(err);
            }
        }));
    await taskPool.start();
    return results;
}

/**
 * @param {{app: import("../types").App, ai: GenerativeAI}} app
 * @param {import("../types").Product} product
 * @returns {Promise<import("../types").SummarizedProduct>}
 */
async function summarizeProduct({ app, ai }, product) {
    let critical = product.reviews?.critical?.map(v => v.content), positive = product.reviews?.positive?.map(v => v.content), maxLength = 40;
    let head = `${product.title.substring(0, maxLength) + (product.title.length > maxLength ? "..." : "")}`;
    app.Logger.info(`Summarizing ${head}`);
    let summary = {
        critical: await callSummarize({ app, ai }, critical, "drawbacks"),
        positive: await callSummarize({ app, ai }, positive, "benefits")
    };
    product.summary = summary;
    let conclusion = await concludeProduct({ app, ai }, product);
    app.Logger.info(`Summarized ${head}`);
    return {
        ...product,
        conclusion
    };
}
