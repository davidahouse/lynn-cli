const ptr = require("json-ptr");

/**
 * schema command
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(state, vorpal, callback) {
  if (state.lastResponse != null && state.lastResponse.body != null) {
    const schema = ptr.flatten(state.lastResponse.body);
    for (const key in schema) {
      if (schema.hasOwnProperty(key) && key != "") {
        vorpal.log(vorpal.chalk.yellow(key));
      }
    }
  } else {
    vorpal.log(vorpal.chalk.yellow("No response found to map schema from"));
  }
  callback();
}

module.exports.handle = handle;
