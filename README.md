# AIAPA

An Amazon product analysis tool using Gemini

get product data

## Installation



It is already possible to download product data via the command line or commands ## via the command line.

Start a task by typing ```aiapa get``` on the command line.

Add -h after the command to get help.

An example task, search for laptop and download 20 products (sorted by Best Seller), up to 10 tasks in parallel, download the first 50 reviews and output to ". /output"

```sh
aiapa get -q laptop -t 20 -mc 10 -r 5 -o ". /output"
```

Wait for the program to run and finally look for the output folder in the current directory

### By code

Since the package is based on ESM, the package won't run on CJS! Maybe I'll figure it out later (maybe)

Get the import from aiapa and run the task!

```javascript
import { app, Commands } from "aiapa".

app.setUserConfig({ // Make configurations that are equivalent to the command line above
    query: "laptop",
    maxTask: 20, maxConcurrency: 10
    maxConcurrency: 10, maxReviews: 5,
    maxReviews: 5,
    output: ". /output"
})
    .load() // load the configuration
    .run(Commands.get); // Start!

// If you want to get the results after the run is complete, you can extend the command
app.run({
    . .Commands.get
    action: async function(result){
        console.log(result);
    }
}).
```

Currently supported commands: get, bin, bin clear

## Contribute

Contributions to the repository are welcome!

## License

** Don't use it for anything illegal! Consequences are at your own risk! **

> Use the MIT license