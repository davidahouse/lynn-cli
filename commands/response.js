/**
 * response command
 * @param {*} key
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(key, state, vorpal, callback) {
  if (key) {
    vorpal.log(
      vorpal.chalk.yellow(JSON.stringify(state.lastResponse[args.key], null, 2))
    );
  } else {
    for (const key in state.lastResponse) {
      if (state.lastResponse.hasOwnProperty(key)) {
        vorpal.log(vorpal.chalk.yellow(key + ":"));
        vorpal.log(
          vorpal.chalk.yellow(JSON.stringify(state.lastResponse[key], null, 2))
        );
      }
    }
  }
  callback();
}

module.exports.handle = handle;
