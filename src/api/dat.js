import fs from "fs/promises";
import path from "path";
import { randomInt } from "../utils.js";

let UAs = [];

export async function loadFile(filePath, encoding = "utf-8") {
    return await fs.readFile(path.resolve(process.cwd(), filePath), encoding);
}

export async function saveFile(filePath, data, encoding = "utf-8") {
    return await fs.writeFile(path.resolve(process.cwd(), filePath), data, encoding);
}

export async function appendFile(filePath, data, encoding = "utf-8") {
    return await fs.appendFile(path.resolve(process.cwd(), filePath), data, encoding);
}

export async function deleteFile(filePath) {
    return await fs.unlink(path.resolve(process.cwd(), filePath));
}

export async function fileExists(filePath) {
    try {
        await fs.access(path.resolve(process.cwd(), filePath));
        return true;
    } catch (error) {
        return false;
    }
}

export async function directoryExists(dirPath) {
    try {
        await fs.access(path.resolve(process.cwd(), dirPath));
        return true;
    } catch (error) {
        return false;
    }
}

export async function clearDirectory(dirPath, whenDeleted = () => { }) {
    if (await directoryExists(dirPath)) {
        const files = await fs.readdir(path.resolve(process.cwd(), dirPath));
        for (const file of files) {
            const filePath = path.resolve(process.cwd(), dirPath, file);
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                await clearDirectory(filePath, whenDeleted);
                await fs.rmdir(filePath);
            } else {
                await fs.unlink(filePath);
            }
            whenDeleted(filePath);
        }
    }
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



