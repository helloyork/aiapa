import { app, Commands } from "../index.js";

// let config1 = {
//     verbose: true,
//     query: "laptop",
//     maxTask: 10,
//     maxConcurrency: 5,
//     maxReviews: 5,
//     output: "./bin"
// };

app.setUserConfig({
    debug: true,
    envFile: "../.env"
}).load().on("beforeCommandRun", (cmd, mod) => {
    mod.registerDetailSelector("links", {
        querySelector: "a",
        evaluate: (el) => el.href
    });
}).run(Commands.get);
