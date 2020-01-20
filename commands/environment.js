const files = require("../lib/files");
const fs = require("fs");

/**
 * environment command
 * @param {*} env
 * @param {*} conf
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(env, conf, state, vorpal, callback) {
  if (env != null) {
    const envFile = files.findFile(conf.workingFolder, env, "environment");
    if (envFile != null) {
      const envContents = fs.readFileSync(envFile);
      const environment = JSON.parse(envContents);
      for (const key in environment) {
        if (environment.hasOwnProperty(key)) {
          state.currentEnvironment[key] = environment[key];
        }
      }
    }
  } else {
    for (const key in state.currentEnvironment) {
      if (state.currentEnvironment.hasOwnProperty(key)) {
        vorpal.log(
          vorpal.chalk.yellow(key + ": " + state.currentEnvironment[key])
        );
      }
    }
  }
  callback();
}

module.exports.handle = handle;
