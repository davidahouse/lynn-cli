const environment = require("../lib/environment");
const request = require("../lib/request");
const files = require("../lib/files");

/**
 * initializeState
 * @param {*} conf
 * @return the new state object
 */
function initializeState(conf) {
  let currentEnvironment = environment.gatherEnvironment(
    conf.workingFolder,
    conf.environment
  );
  const requests = request.gatherRequests(conf.workingFolder);

  const projectInfo = files.projectFileContents(conf.workingFolder);
  if (projectInfo != null && projectInfo.title != null) {
    console.log(chalk.yellow(projectInfo.title));
  }

  if (projectInfo != null && projectInfo.description != null) {
    console.log(chalk.yellow(projectInfo.description));
  }

  const state = {
    currentEnvironment: currentEnvironment,
    lastResponse: {},
    requests: requests,
    projectInfo: projectInfo,
    conf: conf,
    autoSave: conf.autoSave
  };
  return state;
}

module.exports.initializeState = initializeState;
