/**
 * requests command
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(state, vorpal, callback) {
  for (const key in state.requests) {
    if (state.requests.hasOwnProperty(key)) {
      vorpal.log(
        vorpal.chalk.yellow(key) + " - " + state.requests[key].summary
      );
    }
  }
  callback();
}

module.exports.handle = handle;
