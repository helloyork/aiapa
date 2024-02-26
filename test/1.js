import { app, Commands } from "aiapa";

app.setUserConfig({
    verbose: true,
    query: "laptop",
    maxTask: 10,
    maxConcurrency: 5,
    maxReviews: 5,
    output: "./bin"
}).load().run(Commands.get);

