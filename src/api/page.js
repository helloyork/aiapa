import Handlebars from "handlebars";
import fs from "fs";

const Templates = {
    "result-template": "./dat/result-template.hbs"
};

const cache = {};
function getTemplate ({ app }, name) {
    if (cache[name]) {
        return cache[name];
    }
    const path = Templates[name];
    const source = fs.readFileSync(app.App.getFilePath(path), "utf8");
    const template = Handlebars.compile(source);
    cache[name] = template;
    return template;
}

export function renderTemplate ({ app }, name, data) {
    const template = getTemplate({ app }, name);
    return template(data);
}
