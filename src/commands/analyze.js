
import { getFilesToObj, readJSON, saveFile, resolve } from "../api/dat.js";
import { TfIdfAnalyze } from "../api/natural.js";

/**@param {import("../types").App} app */
export default async function main(app) {
    if (app.isImported) {
        let missing = ["file"].filter(k => Object.prototype.hasOwnProperty.call(app.config, k));
        if (missing.length > 0) {
            throw app.Logger.error(new Error(`missing required config ${missing.join(", ")}`));
        }
    }

    let file = app.config.file;
    if (!file) {
        let otherPromt = "OTHER (enter file path).";
        let files = await getFilesToObj(app.App.getFilePath(app.config.binPath));
        let quetions = [...Object.keys(files), app.UI.separator(), otherPromt, app.UI.separator()];
        let res = await app.UI.select("select a file as input", quetions);
        file = res === otherPromt ? await app.UI.input("enter file path:") : files[res];
    }

    if (!file) {
        throw app.Logger.error(new Error("file is required"));
    }

    app.config.file = file;
    app.Logger.info(`file: ${app.UI.hex(app.UI.Colors.Blue)(file)}`);

    try {
        let time = Date.now();
        /**@type {import("../types").Product[]} */
        let data = await readJSON(app.config.file);
        const tfidf = new TfIdfAnalyze();
        let sentences = [];
        data.forEach((product) => {
            tfidf.addDocuments(product.reviews.critical.map(v => v.content));
        });
        tfidf.getParagraphSentenceScores().forEach((item) => {
            sentences.push(...item.sort((a, b) => b.score - a.score).slice(0, 8).map(v => v.sentence));
        });
        app.Logger.log("Similar Sentences:");
        app.Logger.log(`saved to ${app.UI.hex(app.UI.Colors.Blue)(await saveFile(resolve(app.config.output, "result.txt"), sentences.join("\n")))}`);
        // tfidf.filterSimilarSentences(res).forEach((sentence)=>{
        //     console.log(sentence);
        // });
        app.Logger.info(`time: ${app.UI.hex(app.UI.Colors.Blue)(Date.now() - time)}ms`);
    } catch (err) {
        throw app.Logger.error(err);
    }
}
