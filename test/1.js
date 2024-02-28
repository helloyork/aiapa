import { app, Commands } from "../index.js";

app.setUserConfig({
    verbose: true,
    query: "laptop",
    maxTask: 10,
    maxConcurrency: 5,
    maxReviews: 5,
    output: "./bin"
}).load();

app.on("beforeCommandRun", (app, command)=>{
}).run("get");
