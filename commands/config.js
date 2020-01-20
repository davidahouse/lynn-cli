/**
 * config command
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(state, vorpal, callback) {
  vorpal.log(
    vorpal.chalk.yellow("Working Folder: " + state.conf.workingFolder)
  );
  vorpal.log(vorpal.chalk.yellow("Auto Save is " + state.autoSave));
  callback();
}

module.exports.handle = handle;
