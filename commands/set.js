/**
 * reset command
 * @param {*} variable
 * @param {*} value
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(variable, value, state, vorpal, callback) {
  state.currentEnvironment[variable] = value;
  vorpal.log(vorpal.chalk.yellow(variable + " set to " + value));
  callback();
}

module.exports.handle = handle;
