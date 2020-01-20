/**
 * autoSave command
 * @param {*} save
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(save, state, vorpal, callback) {
  if (save != null) {
    if (save === "true") {
      state.autoSave = true;
    } else {
      state.autoSave = false;
    }
  }
  vorpal.log(vorpal.chalk.yellow("AutoSave enabled: " + state.autoSave));
  callback();
}

module.exports.handle = handle;
