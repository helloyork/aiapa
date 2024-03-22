import { GenerativeAI } from "../api/generative.js";
import { getFilesToObj, readJSON, saveFile, resolve, formatDate, createDirIfNotExists, checkDirPermission, selectFile } from "../api/dat.js";
import { TfIdfAnalyze } from "../api/natural.js";
import { TaskPool } from "../utils.js";
import { renderTemplate } from "../api/page.js";

import path from "path";
import open, { apps } from "open";

const settings = {
    MAX_PROMPT_LINES: 300,
    MAX_REVIEW_PER_PRODUCT: 8,
    prompts: ["summarize these product reviews and give me its ", ", return as json format, no markdown, no extra characters, must be short, return as json, no markdown: {\"data\": {[key: reason]: short summary}}, 6~7 row\ndata:\nSTART\n", "\nEND\nsummarize these product reviews and give me its", " ,return as json format, no markdown, no extra characters, return as json: {\"data\": {[key: reason]: short summary}}"],
    prompts2: ["Given product information, provide a final summary of the product containing:\n**Basic Product Description**:\n<Basic Product Description>\n**Summary of Product Strengths**:\n<Summary of Product Strengths>\n**Summary of Product Weaknesses**:\n<Summary of Product Weakness as many as possible>\n\nThe following is the product information:\nSTART\n", "\nEND\n"],
    skipFileChoose: false,
    file: null,
    templateName: "result-template"
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
            const output = {};
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
        const specifications = (Object.keys(product.specifications)).filter(v => product.specifications[v].length).map((v) => `${v}: ${product.specifications[v].join(",")}`).join("\n");
        const data = `title: ${product.title}\nstars: ${product.star}\nprice: ${product.price}\nreview number: ${product.reviewNumber}\nspecifications:${specifications}\nsales:${product.sales}\nsummary: ${JSON.stringify(adapt.summary(product))}`;
        return data;
    }
};

/** @param {import("../types").App} app */
export default async function main(app) {
    if (!app.config.GEMINI_API_KEY && !app.config.apiKey.length) {
        app.Logger.warn(`You don't have an api key yet, Get your API key from ${app.UI.hex(app.UI.Colors.Blue)(GenerativeAI.GET_API_KEY)}`);
        app.exit(app.App.exitCode.OK);
    }

    if (!checkDirPermission(app.App.getFilePath(app.config.binPath))) {
        app.Logger.error("No permission to write to: " + app.config.binPath + ", please check your permission");
        return;
    }

    const file = settings.skipFileChoose ? settings.file : await chooseFile({ app });
    if (!file) {
        throw app.Logger.error(new Error("file is required"));
    }

    app.config.file = file;
    app.Logger.info(`file: ${app.UI.hex(app.UI.Colors.Blue)(file)}`);
    const ai = new GenerativeAI(app, {
        apikeyPool: [...(app.config.GEMINI_API_KEY ? [app.config.GEMINI_API_KEY] : []), ...(app.config.apiKey ? [...app.config.apiKey] : [])]
    });

    try {
        const time = Date.now();
        /** @type {import("../types").Product[]} */
        const data = await readJSON(app.config.file);

        const results = await summarize({ app, ai }, data);
        const name = `summarized-${formatDate(new Date())}-${path.basename(app.config.file)}.json`;
        app.Logger.log(`saved to ${app.UI.hex(app.UI.Colors.Blue)(await saveFile(resolve(app.config.output, name), JSON.stringify(results)))}`);

        const _path = await saveRenderable({ app }, results);
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

/** @param {{app: import("../types").App}} app */
async function chooseFile({ app }) {
    let file = app.config.file;
    if (!file) {
        const otherPromt = "OTHER (select file).";
        await createDirIfNotExists(app.config.output);
        const files = await getFilesToObj(app.App.getFilePath(app.config.binPath));
        const quetions = [...Object.keys(files).filter(v => v.endsWith(".json")), app.UI.separator(), otherPromt, app.UI.separator()];
        const res = await app.UI.select("select a file as input", quetions);
        if (res === otherPromt) {
            try {
                file = await selectFile({
                    types: [
                        [
                            "JSON",
                            "*.json"
                        ]
                    ]
                });
            } catch (err) {
                app.Logger.warn(err.message);
                file = await app.UI.input("Enter the file path: ");
            }
        } else {
            file = files[res];
        }
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
            const hrefU = new URL(v.href); const stars = Math.ceil(parseInt(v.star));
            return {
                name: v.title,
                href: hrefU.origin + hrefU.pathname,
                stars: stars ? (`(${v.star}) ` + "⭐".repeat(stars) + "☆".repeat(5 - stars)) : "N/A",
                reviewNumber: v.reviewNumber,
                sales: v.sales,
                description: v.conclusion,
                price: v.price,
                attributes: [{
                    name: "review link",
                    value: v.productsReviewLink
                }, ...(Object.keys(v.specifications)).filter(k => v.specifications[k].length).map((key) => {
                    return {
                        name: key,
                        value: v.specifications[key].join(", ")
                    };
                }), ...(Object.keys(v.attr)).map((key) => {
                    return {
                        name: key,
                        value: v.specifications[key].join(", ")
                    };
                })]
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
    const out = getRenderable(datas);
    const result = renderTemplate({ app }, settings.templateName, out);
    const file = resolve(app.config.output, `result-${formatDate(new Date())}-${path.basename(app.config.file)}.html`);
    const _path = await saveFile(file, result);
    app.Logger.log(`saved results to ${app.UI.hex(app.UI.Colors.Blue)(file)}`);
    return _path;
}

function getSortedSentences(sentences, max = settings.MAX_REVIEW_PER_PRODUCT) {
    const tfidf = new TfIdfAnalyze();
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
    const res = [];
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
    const result = await ai.getAPIRotated().call(insertPrompt(settings.prompts2, [adapt.productify(product)]));
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
        const res = await summarizeProduct({ app, ai }, product);
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
    const sentences = getSortedSentences(reviews);
    const prompts = splitArray(sentences, settings.MAX_PROMPT_LINES).map((v) => insertPrompt(settings.prompts, [side, v.join("\n"), side]));
    const results = [];
    const taskPool = new TaskPool(app.config.maxConcurrency, app.App.staticConfig.DELAY_BETWEEN_TASK).addTasks(
        prompts.map((v) => async function run(tried = 0) {
            try {
                const result = await ai.getAPIRotated().call(v);
                const parsed = adapt.get(result);
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
    const critical = product.reviews?.critical?.map(v => v.content); const positive = product.reviews?.positive?.map(v => v.content); const maxLength = 40;
    const head = `${product.title.substring(0, maxLength) + (product.title.length > maxLength ? "..." : "")}`;
    app.Logger.info(`Summarizing ${head}`);
    const summary = {
        critical: await callSummarize({ app, ai }, critical, "drawbacks"),
        positive: await callSummarize({ app, ai }, positive, "benefits")
    };
    product.summary = summary;
    const conclusion = await concludeProduct({ app, ai }, product);
    app.Logger.info(`Summarized ${head}`);
    return {
        ...product,
        conclusion
    };
}
