
# AIAPA

An Amazon product analysis tool, using Gemini.

Fetch product data.

## Installation

You can now download product data via command line or instructions.

```sh
npm i aiapa -g
```

### Via Command Line

Enter `aiapa get` in the command line to start a task.

Add `-h` after the command to get command help.

Here is an example task: search for "laptop" and download information for 20 products (sorted by Best Seller), with a maximum of 10 concurrent tasks, download the first 50 reviews, and finally output to "./output".

```sh
aiapa get -q laptop -t 20 -mc 10 -r 5 -o "./output"
```

Wait for the program to run, and finally check the "output" folder in the current directory.

### Via Code

Since this package is based on ESM, it cannot run on CJS! Maybe I will find a way in the future (in the future).

Import from aiapa and run the task!

```javascript
import { app, Commands } from "aiapa";

app.setUserConfig({ // Set the configuration, these configurations are equivalent to the above command line
    query: "laptop",
    maxTask: 20,
    maxConcurrency: 10,
    maxReviews: 5,
    output: "./output"
})
    .load() // Load the configuration
    .run(Commands.get); // Start!

// If you want to get the result after the run is complete, you can extend the command
app.run({
    ...Commands.get,
    action: async function(result){
        console.log(result);
    }
});
```

Currently supported commands: get, bin, bin clear

## Contribution

Contributions to the repository are welcome!

## License

**Do not use it for any illegal activities! You are responsible for the consequences!**

> Licensed under MIT
```
