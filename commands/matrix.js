/**
 * matrix command
 * @param {*} requestName
 * @param {*} x
 * @param {*} y
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(requestName, x, y, state, vorpal, callback) {
  const xaxis = x.split(",");
  const yaxis = y.split(",");

  const rootPath = files.rootPath(state.conf.workingFolder, "requests");
  const apiFile = request.parseApiFile(
    rootPath + "/" + requests[requestName].file
  );
  if (apiFile == null) {
    callback();
    return;
  }

  const q = new Queue(function(iteration, cb) {
    const spinner = new Ora("--> " + requestName, "clock").start();

    const xFile = files.findFile(
      state.conf.workingFolder,
      iteration.x,
      "environment"
    );
    if (xFile != null) {
      const envContents = fs.readFileSync(xFile);
      const environment = JSON.parse(envContents);
      for (const key in environment) {
        if (environment.hasOwnProperty(key)) {
          state.currentEnvironment[key] = environment[key];
        }
      }
    }

    const yFile = files.findFile(
      state.conf.workingFolder,
      iteration.y,
      "environment"
    );
    if (yFile != null) {
      const envContents = fs.readFileSync(yFile);
      const environment = JSON.parse(envContents);
      for (const key in environment) {
        if (environment.hasOwnProperty(key)) {
          state.currentEnvironment[key] = environment[key];
        }
      }
    }

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
        state.lastResponse = result;
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
    callback();
  });

  xaxis.forEach(x => {
    yaxis.forEach(y => {
      q.push({ x: x, y: y });
    });
  });
}

module.exports.handle = handle;
