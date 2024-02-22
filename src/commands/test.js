

/**@param {import("../cli.js").App} app */
export default async function main(app) {
    console.log(app.config.debug);
    console.log(app.config);
    console.log("hello world!");
    let res = await app.App.UI.confirm("Are you sure?");
    console.log(res);
    res = await app.App.UI.input("What is your name?");
    console.log(res);
    res = await app.App.UI.select("What is your favorite color?", ["Red", "Green", "Blue"]);
    console.log(res);
    res = await app.App.UI.checkbox("What are your favorite colors?", ["Red", "Green", "Blue"]);
    console.log(res);
    res = await app.App.UI.password("What is your password?");
    console.log(res);
    app.Logger.log("Hello World!" + app.UI.hex(app.UI.Colors.Red)("Hello World!"));
    app.Logger.info("Hello World!");
    app.Logger.error("Hello World!");
    app.Logger.debug("Hello World!");
}
