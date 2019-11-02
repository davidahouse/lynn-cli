const fs = require('fs');
const files = require('./files');

/**
 * gatherEnvironment
 * @param {string} workingFolder
 * @param {string} environmentFiles
 * @return {object} environment and user dictionary
 */
function gatherEnvironment(workingFolder, environmentFiles) {
  const environment = {};
  if (environmentFiles == null) {
    return environment;
  }
  const envFiles = environmentFiles.split(',');
  envFiles.forEach(function(environmentFile) {
    const envFileName = files.findFile(
      workingFolder,
      environmentFile,
      'environment'
    );
    if (envFileName != null) {
      const envContents = fs.readFileSync(envFileName);
      const env = JSON.parse(envContents);
      for (const key in env) {
        if (env.hasOwnProperty(key)) {
          environment[key] = env[key];
        }
      }
    }
  });
  return environment;
}

module.exports.gatherEnvironment = gatherEnvironment;
