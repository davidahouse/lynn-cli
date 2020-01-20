/**
 * reset command
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(state, vorpal, callback) {
  state.currentEnvironment = {};
  state.lastResponse = {};
  state.lastRequest = {};
  vorpal.log("");
  callback();
}

module.exports.handle = handle;
