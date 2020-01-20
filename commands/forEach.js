const files = require("../lib/files");
const request = require("../lib/request");

/**
 * forEach command
 * @param {*} variable
 * @param {*} requestName
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(variable, requestName, state, vorpal, callback) {
  if (requests[requestName] == null) {
    vorpal.log(vorpal.chalk.red("Request " + requestName + " not found"));
    callback();
    return;
  }

  if (state.currentEnvironment[variable] == null) {
    vorpal.log(vorpal.chalk.red("Environment does not contain " + variable));
    callback();
    return;
  } else if (!Array.isArray(state.currentEnvironment[variable])) {
    vorpal.log(vorpal.chalk.red(variable + " is not an array"));
    callback();
    return;
  }

  const rootPath = files.rootPath(state.conf.workingFolder, "requests");
  const apiFile = request.parseApiFile(
    rootPath + "/" + requests[requestName].file
  );
  if (apiFile == null) {
    vorpal.log(vorpal.chalk.red("Unable to load request"));
    callback();
    return;
  }

  const savedEnvironmentValues = state.currentEnvironment[variable];
  const q = new Queue(function(currentValue, cb) {
    const spinner = new Ora("--> " + requestName, "clock").start();
    state.currentEnvironment[variable] = currentValue;
    request.executeRequest(
      state.conf.workingFolder,
      state.currentEnvironment,
      apiFile,
      requestName,
      state.autoSave,
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
        lastResponse = result;
        const capturedValues = request.capture(apiFile, requestName, result);
        for (const key in capturedValues) {
          if (capturedValues.hasOwnProperty(key)) {
            state.currentEnvironment[key] = capturedValues[key];
          }
        }
        cb();
      }
    );
  });

  q.on("drain", function() {
    state.currentEnvironment[variable] = savedEnvironmentValues;
    callback();
  });

  savedEnvironmentValues.forEach(currentValue => {
    q.push(currentValue);
  });
}

module.exports.handle = handle;
