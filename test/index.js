import { app, Commands } from "../index.js";

// app.setUserConfig({
//     verbose: true,
//     query: "laptop",
//     maxTask: 3,
//     maxConcurrency: 5,
//     maxReviews: 5,
//     output: "./bin",
//     envFile: "../.env"
// })
//     .load()
//     .on("beforeCommandRun", (...args) => {
//         console.log(args);
//     }).run({
//         ...Commands.get,
//         action: (result)=> console.log(result)
//     });

app.load().run(Commands.start);

