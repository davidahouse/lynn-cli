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
  const requestEnvironment = environmentWithDefaults(request, environment)
  if (!validEnvironment(request, requestEnvironment)) {
    callback({error: 'Missing one or more required envionment variables: ' + request.parameters.required})
    return
  }

  const runner = new LynnRunner(request, requestEnvironment)
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
  const environment = environmentWithDefaults(request, JSON.parse(environments.pop()))
  if (!validEnvironment(request, environment)) {
    callback({error: 'Missing one or more required envionment variables: ' + request.parameters.required})
    return
  }
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

/**
 * validEnvironment
 * @param {object} request the request object
 * @param {object} environment variables
 * @return {bool} if the environment contains all the required parameters or not
 */
function validEnvironment(request, environment) {
  if (!request.parameters || !request.parameters.required) {
    return true
  }
  let valid = true
  request.parameters.required.forEach((param) => {
    if (!environment.hasOwnProperty(param)) {
      valid = false
    }
  })
  return valid
}

/**
 * environmentWithDefaults
 * @param {object} request
 * @param {object} environment
 * @return {object} environment containing defaults
 */
function environmentWithDefaults(request, environment) {
  if (!request.parameters || !request.parameters.defaults) {
    return environment
  }
  const newEnvironment = environment
  for (const key in request.parameters.defaults) {
    if (request.parameters.defaults.hasOwnProperty(key)) {
      if (!newEnvironment.hasOwnProperty(key)) {
        newEnvironment[key] = request.parameters.defaults[key]
      }
    }
  }
  return newEnvironment
}

module.exports.executeRequest = executeRequest
module.exports.executeIteration = executeIteration
