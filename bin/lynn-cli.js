#!/usr/bin/env node
const fs = require("fs");
const chalk = require("chalk");
const clear = require("clear");
const figlet = require("figlet");
const vorpal = require("vorpal")();
const Ora = require("ora");
const jp = require("jsonpath");
const ptr = require("json-ptr");
const pkginfo = require("pkginfo")(module);
const Queue = require("better-queue");
const conf = require("rc")("lynn", {
  // defaults
  workingFolder: process.env.HOME + "/.lynn",
  autoSave: false,
  interactive: true
});

// Internal helpers
const files = require("../lib/files");
const request = require("../lib/request");
const state = require("../lib/state");

// Commands
const commandEnvironment = require("../commands/environment");
const commandResponse = require("../commands/response");
const commandAutoSave = require("../commands/autoSave");
const commandReset = require("../commands/reset");
const commandQuery = require("../commands/query");
const commandSet = require("../commands/set");
const commandEval = require("../commands/eval");
const commandSetArray = require("../commands/setArray");
const commandAppend = require("../commands/append");
const commandGenerate = require("../commands/generate");
const commandSchema = require("../commands/schema");
const commandMatrix = require("../commands/matrix");
const commandConfig = require("../commands/config");
const commandRequests = require("../commands/requests");
const commandRequest = require("../commands/request");
const commandForEach = require("../commands/forEach");
const commandSave = require("../commands/save");

clear();
console.log(
  chalk.yellow(figlet.textSync("lynn", { horizontalLayout: "full" }))
);
console.log(chalk.yellow(module.exports.version));

// Setup our initial state
let currentState = state.initializeState(conf);

// Handle bool conf values from the command line (or other places)
if (conf.interactive === "false") {
  conf.interactive = false;
}
if (conf.autoSave === "true") {
  conf.autoSave = true;
}

if (conf.interactive) {
  vorpal
    .command(
      "environment [env]",
      "Add to current environment or display current environment"
    )
    .autocomplete({
      data: function() {
        return files.listFiles(conf.workingFolder, "environment");
      }
    })
    .action(function(args, callback) {
      commandEnvironment.handle(args.env, conf, currentState, vorpal, callback);
    });

  vorpal
    .command("reset", "Reset any saved config")
    .action(function(args, callback) {
      commandReset.handle(currentState, vorpal, callback);
    });

  vorpal
    .command("response [key]", "View the contents of the last response")
    .action(function(args, callback) {
      commandResponse.handle(args.key, currentState, vorpal, callback);
    });

  vorpal
    .command("autoSave [save]", "Turn on/off saving of responses")
    .action(function(args, callback) {
      commandAutoSave.handle(args.save, currentState, vorpal, callback);
    });

  vorpal
    .command("query <path>", "Query the last response using jsonpath syntax")
    .action(function(args, callback) {
      commandQuery.handle(args.path, currentState, vorpal, callback);
    });

  vorpal
    .command("set <variable> <value>", "Set a value in the current environment")
    .action(function(args, callback) {
      commandSet.handle(
        args.variable,
        args.value,
        currentState,
        vorpal,
        callback
      );
    });

  vorpal
    .command(
      "eval <variable> <value>",
      "Set a value in the current environment by evaluating a javascript statement"
    )
    .action(function(args, callback) {
      commandEval.handle(
        args.variable,
        args.value,
        currentState,
        vorpal,
        callback
      );
    });

  vorpal
    .command(
      "setArray <variable>",
      "Make an entry in the environment an empty array"
    )
    .action(function(args, callback) {
      commandSetArray.handle(args.variable, currentState, vorpal, callback);
    });

  vorpal
    .command(
      "append <variable> <value>",
      "Appends a value to an existing array"
    )
    .action(function(args, callback) {
      commandAppend.handle(
        args.variable,
        args.value,
        currentState,
        vorpal,
        callback
      );
    });

  vorpal
    .command("generate", "Generate the docs for this project")
    .action(function(args, callback) {
      commandGenerate.handle(currentState, vorpal, callback);
    });

  vorpal
    .command(
      "schema",
      "Generate the list of paths found in the response data json"
    )
    .action(function(args, callback) {
      commandSchema.handle(currentState, vorpal, callback);
    });

  vorpal
    .command(
      "matrix <request> <xaxis> <yaxis>",
      "Execute a series of requests with a combination of environment files"
    )
    .action(function(args, callback) {
      commandMatrix.handle(
        args.request,
        args.xaxis,
        args.yaxis,
        currentState,
        vorpal,
        callback
      );
    });

  vorpal
    .command("config", "Show the current config")
    .action(function(args, callback) {
      commandConfig.handle(currentState, vorpal, callback);
    });

  vorpal
    .command("requests", "List all the requests available")
    .action(function(args, callback) {
      commandRequests.handle(currentState, vorpal, callback);
    });
  vorpal
    .command("request <name>", "Execute a request inside an OpenAPI spec")
    .autocomplete({
      data: function() {
        return Object.keys(requests);
      }
    })
    .action(function(args, callback) {
      commandRequest.handle(args.name, currentState, vorpal, callback);
    });
  vorpal
    .command(
      "forEach <variable> <request>",
      "Execute a series of requests based on an environment variable array"
    )
    .autocomplete({
      data: function() {
        return Object.keys(requests).concat(Object.keys(currentEnvironment));
      }
    })
    .action(function(args, callback) {
      commandForEach.handle(
        args.variable,
        args.request,
        currentState,
        vorpal,
        callback
      );
    });

  vorpal
    .command("save", "Saves the most recent response")
    .action(function(args, callback) {
      commandSave.handle(currentState, vorpal, callback);
    });

  vorpal.history("stampede-cli");
  vorpal.delimiter("lynn-cli>").show();
} else {
  if (conf.request != null) {
    const spinner = new Ora("--> " + conf.request, "clock").start();
    const rootPath = files.rootPath(conf.workingFolder, "requests");
    const apiFile = request.parseApiFile(
      rootPath + "/" + requests[conf.request].file
    );
    if (apiFile != null) {
      request.executeRequest(
        conf.workingFolder,
        currentEnvironment,
        apiFile,
        conf.request,
        conf.autoSave,
        function(result, response) {
          if (result.statusCode) {
            if (result.statusCode < 300) {
              spinner.color = "green";
              spinner.succeed("--> " + chalk.green(response));
            } else if (result.statusCode > 300) {
              spinner.fail("--> " + chalk.red(response));
            }
          } else {
            spinner.fail("--> " + chalk.red(result.error));
          }
        }
      );
    } else {
      spinner.fail("--> " + chalk.red("request not found"));
    }
  }
}
