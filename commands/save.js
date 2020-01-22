const dateFormat = require("dateformat");
const mkdirp = require("mkdirp");
const fs = require("fs");

/**
 * save command
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(state, vorpal, callback) {
  const savePath =
    state.conf.workingFolder + "/log/" + state.lastRequest.title + "/";
  const timestamp =
    dateFormat(new Date(), "yyyy_mm_dd_HH:MM:ss_l") +
    "_" +
    Math.floor(Math.random() * Math.floor(10));
  const saveFile = state.lastResponse.statusCode + "_" + timestamp + ".json";
  mkdirp(savePath, function(err) {
    fs.writeFileSync(
      savePath + saveFile,
      JSON.stringify(state.lastResponse, null, 2)
    );
    vorpal.log(vorpal.chalk.green("Response saved to " + saveFile));
  });
  callback();
}

module.exports.handle = handle;
