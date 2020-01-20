/**
 * reset command
 * @param {*} variable
 * @param {*} value
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(variable, value, state, vorpal, callback) {
  const result = eval(value);
  state.currentEnvironment[variable] = result;
  vorpal.log(vorpal.chalk.yellow(variable + " set to " + result));
  callback();
}

module.exports.handle = handle;
