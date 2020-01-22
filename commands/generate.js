const files = require("../lib/files");
const generate = require("../lib/generate");
const request = require("../lib/request");

/**
 * generate command
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(state, vorpal, callback) {
  const rootPath = files.rootPath(state.conf.workingFolder, "requests");
  const summaries = [];
  for (const key in state.requests) {
    const apiFile = request.parseApiFile(
      rootPath + "/" + state.requests[key].file
    );
    summaries.push(
      generate.generateDocs(state.conf.workingFolder, key, apiFile)
    );
    vorpal.log(vorpal.chalk.green("✅ --> " + key + " doc generated"));
  }
  generate.generateReadme(state.conf.workingFolder, summaries);
  vorpal.log(vorpal.chalk.green("✅ --> Readme.md generated"));
  callback();
}

module.exports.handle = handle;
