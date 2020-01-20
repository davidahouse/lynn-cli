/**
 * append command
 * @param {*} variable
 * @param {*} value
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(variable, value, state, vorpal, callback) {
  if (
    state.currentEnvironment[variable] != null &&
    Array.isArray(state.currentEnvironment[variable])
  ) {
    state.currentEnvironment[variable].push(value);
    vorpal.log(
      vorpal.chalk.yellow("Appended " + value + " to array " + variable)
    );
  } else {
    vorpal.log(
      vorpal.chalk.red(variable + " is not an array, unable to append")
    );
  }
  callback();
}

module.exports.handle = handle;
