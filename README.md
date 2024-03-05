# AIAPA - AI Analysis of Products on Amazon

AIAPA is a Gemini-powered Amazon product analysis tool currently in development. It supports downloading product data via the `get` command, and while there are still refinements to be made, we welcome any problems encountered or suggestions via issue.

**The tool may result in short-term soft bans and permanent bans! Please consider carefully before using it and set a reasonable amount of tasks!**

## Installation Guide

AIAPA can be installed globally with the following command:

```sh
npm install aiapa -g
```

## Instruction

AIAPA can be started from the command line or through a code interface, and supports passing in parameters, calling commands, listening to events, and more.

### Example of using the Get command

- **Command line startup**: enter `aiapa get` to start the task, the sample code is as follows:

```sh
aiapa get -q laptop -t 20 -mc 10 -r 5 -o "./output"
```

Using the --low-ram flag reduces some of the memory usage  
Be sure to reserve at least 2GB of memory usage when running

- **Code Interface Launch**: The sample code is as follows, demonstrating the functions of configuring, running a task, and getting results:

```javascript
import { app, Commands } from "aiapa";

app.setUserConfig({
    query: "laptop",
    maxTask: 20,
    maxConcurrency: 10,
    maxReviews: 5,
    output: "./output"
}).load().run(Commands.get);

// Example of getting results
app.run({
    ...Commands.get,
    action: async function(result) {
        console.log(result);
    }
});

// Custom Selector Registration Example
app.on("beforeCommandRun", (cmd, mod) => {
    mod.registerDetailSelector("links", {
        querySelector: "a",
        evaluate: (el) => el.href
    });
}).run(Commands.get);
```

## Update

### 2024/3/5

This update added the following features:

1. Proxy mode
2. Low memory mode
3. Page pool
4. Useful subcommands for bin (whereis, list)

Changed the following features:

1. Added error handling and ban detection
2. Added some APIs
3. Handled some unexpected crashes
4. Fixed the page loading issue
5. Optimized speed

## Contributions and Licenses

Contributions to the AIAPA program are welcome. **Please ensure that your use is in accordance with the terms of service of the target site and relevant legal regulations.**

> AIAPA is published under the MIT license.
