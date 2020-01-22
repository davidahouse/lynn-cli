const Ora = require("ora");
const files = require("../lib/files");
const request = require("../lib/request");

/**
 * request command
 * @param {*} name
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(name, state, vorpal, callback) {
  if (state.requests[name] == null) {
    vorpal.log(vorpal.chalk.red("Request " + name + " not found"));
    callback();
    return;
  }

  const spinner = new Ora("--> " + name, "clock").start();
  const rootPath = files.rootPath(state.conf.workingFolder, "requests");
  const apiFile = request.parseApiFile(
    rootPath + "/" + state.requests[name].file
  );
  if (apiFile != null) {
    request.executeRequest(
      state.conf.workingFolder,
      state.currentEnvironment,
      apiFile,
      name,
      state.autoSave,
      function(result, response, executedRequest) {
        if (result.statusCode) {
          if (result.statusCode < 300) {
            spinner.color = "green";
            spinner.succeed("--> " + vorpal.chalk.green(response));
          } else if (result.statusCode > 300) {
            spinner.fail("--> " + vorpal.chalk.red(response));
          }
        } else {
          spinner.fail("--> " + vorpal.chalk.red(result.error));
        }
        state.lastResponse = result;
        state.lastRequest = executedRequest;
        const capturedValues = request.capture(apiFile, name, result);
        for (const key in capturedValues) {
          if (capturedValues.hasOwnProperty(key)) {
            state.currentEnvironment[key] = capturedValues[key];
          }
        }
        vorpal.log(vorpal.chalk.yellow(JSON.stringify(result, null, 2)));
        callback();
      }
    );
  }
}

module.exports.handle = handle;
