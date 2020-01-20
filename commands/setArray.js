/**
 * setArray command
 * @param {*} variable
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(variable, state, vorpal, callback) {
  state.currentEnvironment[variable] = [];
  vorpal.log(vorpal.chalk.yellow(variable + " set to an empty array"));
  callback();
}

module.exports.handle = handle;
