import fs from "fs/promises";
import path from "path";
import { randomInt } from "../utils.js";

let UAs = [];

export async function loadFile(filePath, encoding = "utf-8") {
    return await fs.readFile(path.resolve(process.cwd(), filePath), encoding);
}

export async function randomUserAgent() {
    if (UAs.length === 0) {
        UAs = (await loadFile(path.join(process.cwd(), "src/dat/user-agents.txt")))
            .split("\n")
            .map((ua) => ua.trim())
            .filter((ua) => ua.length > 0);
    }
    return UAs[randomInt(0, UAs.length - 1)];
}

/**
 * @param {string} url 
 * @param {RequestInit} options 
 * @returns {Promise<Response>}
 */
export async function loadWeb(url, options = {}) {
    return await fetch(url, options);
}



