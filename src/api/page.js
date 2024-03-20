
import Handlebars from "handlebars";
import fs from "fs";

const Templates = {
    "result-template": "./dat/result-template.hbs",
};

let cache = {};
function getTemplate({ app }, name) {
    if (cache[name]) {
        return cache[name];
    }
    let path = Templates[name];
    let source = fs.readFileSync(app.App.getFilePath(path), "utf8");
    let template = Handlebars.compile(source);
    cache[name] = template;
    return template;
}

export function renderTemplate({ app }, name, data) {
    let template = getTemplate({ app }, name);
    return template(data);
}

