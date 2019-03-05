const files = require('./files')
const request = require('./request')
const Ora = require('ora')
const chalk = require('chalk')

/**
 * executeFlowSteps
 * @param {workingFolder} workingFolder
 * @param {string} environment
 * @param {object} steps
 * @param {string} currentProject
 * @param {bool} autoSave
 * @param {function} callback
 */
function executeFlowSteps(workingFolder, environment, steps, currentProject, autoSave, callback) {
  steps.forEach((stepDetails) => {
    const requestFile = files.findFile(workingFolder, stepDetails.request, 'requests', currentProject)
    if (requestFile != null) {
      const spinner = new Ora('--> ' + stepDetails.request, 'clock').start()
      request.executeRequest(workingFolder, environment, requestFile, currentProject, autoSave, function(result, response, captured) {
        if (result.statusCode < 300) {
          spinner.color = 'green'
          spinner.succeed('--> ' + requestFile + ' ' + chalk.green(response))
        } else if (result.statusCode > 300) {
          spinner.fail('--> ' + requestFile + ' ' + chalk.red(response))
        }
        const newEnvironment = environment
        for ( const key in captured ) {
          if (captured.hasOwnProperty(key)) {
            newEnvironment[key] = captured[key]
          }
        }

        try {
          if (stepDetails.nextSteps) {
            executeFlowSteps(workingFolder, newEnvironment, stepDetails.nextSteps.steps, currentProject, autoSave, function() {
            })
          } else if (stepDetails.forEachSteps) {
            newEnvironment[stepDetails.forEachSteps.environment].forEach((variable) => {
              const childEnvironment = newEnvironment
              childEnvironment[stepDetails.forEachSteps.environment] = variable
              executeFlowSteps(workingFolder, childEnvironment, stepDetails.forEachSteps.steps, currentProject, autoSave, function() {
              })
            })
          } else if (stepDetails.forEachFirstSteps) {
            newEnvironment[stepDetails.forEachFirstSteps.environment][0].forEach((variable) => {
              const childEnvironment = newEnvironment
              childEnvironment[stepDetails.forEachFirstSteps.environment] = variable
              executeFlowSteps(workingFolder, childEnvironment, stepDetails.forEachFirstSteps.steps, currentProject, autoSave, function() {
              })
            })
          }
        } catch (e) {
          console.log('Exception processing completed request')
          console.log(e)
        }
      })
    } else {
      console.log('unable to find request file ' + stepDetails.request)
    }
  })
  callback()
}

module.exports.executeFlowSteps = executeFlowSteps
