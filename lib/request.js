const fs = require('fs')
const LynnRunner = require('@davidahouse/lynn')
const mkdirp = require('mkdirp')
const dateFormat = require('dateformat')
const Ora = require('ora')
const chalk = require('chalk')

/**
 * executeRequest
 * @param {workingFolder} workingFolder
 * @param {string} environment dictionary
 * @param {string} requestFile file
 * @param {string} currentProject
 * @param {bool} autoSave
 * @param {function} callback when request is complete
 */
function executeRequest(workingFolder, environment, requestFile, currentProject, autoSave, callback) {
  const requestContents = fs.readFileSync(requestFile)
  const request = JSON.parse(requestContents)

  const runner = new LynnRunner(request, environment)
  runner.execute(function(result) {
    const response = request.title + ' [' +
                  result.statusCode + '] ' + result.responseTime + 'ms'
    if (autoSave == true) {
      // default location and name should be:
      // project/log/<request without .json>/<status code>_<date time>.json
      const projectPath = currentProject != null ? '/' + currentProject : ''
      const savePath = workingFolder + projectPath + '/log/' + request.title +
          '/'
      const timestamp = dateFormat(new Date(), 'yyyy_mm_dd_HH:MM:ss_l') + '_' +
                        Math.floor(Math.random() * Math.floor(10))
      const saveFile = result.statusCode + '_' + timestamp + '.json'
      mkdirp(savePath, function(err) {
        fs.writeFileSync(savePath + saveFile, JSON.stringify(result, null, 2))
      })
    }

    const captured = runner.captured(result)
    callback(result, response, captured)
  })
}

/**
 * executeIteration
 * @param {string} workingFolder
 * @param {array} environments
 * @param {string} requestFile
 * @param {string} currentProject
 * @param {bool} autoSave
 * @param {function} callback
 */
function executeIteration(workingFolder, environments, requestFile, currentProject, autoSave, callback) {
  const requestContents = fs.readFileSync(requestFile)
  const request = JSON.parse(requestContents)
  const environment = JSON.parse(environments.pop())
  const runner = new LynnRunner(request, environment)
  const spinner = new Ora('--> ' + requestFile, 'clock').start()
  runner.execute(function(result) {
    const response = request.title + ' [' +
                  result.statusCode + '] ' + result.responseTime + 'ms'

    if (result.statusCode < 300) {
      spinner.color = 'green'
      spinner.succeed('--> ' + requestFile + ' ' + chalk.green(response))
    } else if (result.statusCode > 300) {
      spinner.fail('--> ' + requestFile + ' ' + chalk.red(response))
    }
    if (autoSave == true) {
      // default location and name should be:
      // project/log/<request without .json>/<status code>_<date time>.json
      const projectPath = currentProject != null ? '/' + currentProject : ''
      const savePath = workingFolder + projectPath + '/log/' + request.title +
          '/'
      const timestamp = dateFormat(new Date(), 'yyyy_mm_dd_HH:MM:ss_l') + '_' +
                        Math.floor(Math.random() * Math.floor(10))
      const saveFile = result.statusCode + '_' + timestamp + '.json'
      mkdirp(savePath, function(err) {
        fs.writeFileSync(savePath + saveFile, JSON.stringify(result, null, 2))
      })
    }

    if (environments.length > 0) {
      executeIteration(workingFolder, environments, requestFile, currentProject, autoSave, callback)
    } else {
      callback()
    }
  })
}

module.exports.executeRequest = executeRequest
module.exports.executeIteration = executeIteration
