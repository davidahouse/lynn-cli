const jp = require("jsonpath");
const ptr = require("json-ptr");

/**
 * query command
 * @param {*} path
 * @param {*} state
 * @param {*} vorpal
 * @param {*} callback
 */
async function handle(path, state, vorpal, callback) {
  // Support three kinds of query here:
  // default is just a JSON pointer query into the response data
  // second if the user starts the query with $ then we do a full query across
  // entire response object
  // third if the user starts the query with ? then we perform a JSON path query
  let found = null;
  try {
    if (path.startsWith("$")) {
      const searchObject = { response: state.lastResponse };
      found = ptr.get(searchObject, path.substring(1));
    } else if (path.startsWith("?")) {
      found = jp.query(state.lastResponse.body, "$" + path.substring(1));
    } else {
      found = ptr.get(state.lastResponse.body, path);
    }
    vorpal.log(vorpal.chalk.yellow(JSON.stringify(found, null, 2)));
  } catch (e) {
    vorpal.log(vorpal.chalk.red("Error performing query " + e));
  }
  callback();
}

module.exports.handle = handle;
