import fs from "fs/promises";
import path from "path";

export async function loadFile(filePath, encoding = "utf-8") {
    return await fs.readFile(path.resolve(process.cwd(), filePath), encoding);
}



