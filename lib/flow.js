const files = require('./files')
const request = require('./request')
const Ora = require('ora')
const chalk = require('chalk')
const Queue = require('better-queue')

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

  const q = new Queue(function(task, cb) {
    const requestFile = files.findFile(task.workingFolder, task.stepDetails.request, 'requests', task.currentProject)
    if (requestFile != null) {
      const spinner = new Ora('--> ' + task.stepDetails.request, 'clock').start()
      request.executeRequest(task.workingFolder, task.environment, requestFile, task.currentProject, task.autoSave, function(result, response, captured) {
        if (result.statusCode < 300) {
          spinner.color = 'green'
          spinner.succeed('--> ' + task.stepDetails.request + ' ' + chalk.green(response))
        } else if (result.statusCode > 300) {
          spinner.fail('--> ' + task.stepDetails.request + ' ' + chalk.red(response))
        }

        const newEnvironment = task.environment
        for ( const key in captured ) {
          if (captured.hasOwnProperty(key)) {
            newEnvironment[key] = captured[key]
          }
        }

        try {
          if (task.stepDetails.nextSteps) {
            queueFlowSteps(q, task.workingFolder, newEnvironment, task.stepDetails.nextSteps.steps, task.currentProject, task.autoSave)
          } else if (task.stepDetails.forEachSteps) {
            newEnvironment[task.stepDetails.forEachSteps.environment].forEach((variable) => {
              const childEnvironment = newEnvironment
              childEnvironment[task.stepDetails.forEachSteps.environment] = variable
              queueFlowSteps(q, task.workingFolder, childEnvironment, task.stepDetails.forEachSteps.steps, task.currentProject, task.autoSave)
            })
          } else if (task.stepDetails.forEachFirstSteps) {
            newEnvironment[task.stepDetails.forEachFirstSteps.environment][0].forEach((variable) => {
              const childEnvironment = newEnvironment
              childEnvironment[task.stepDetails.forEachFirstSteps.environment] = variable
              queueFlowSteps(q, task.workingFolder, childEnvironment, task.stepDetails.forEachFirstSteps.steps, task.currentProject, task.autoSave)
            })
          }
        } catch (e) {
          console.log('Exception processing completed request')
          console.log(e)
        }
        cb()
      })
    }
  }, {concurrent: 3} )

  q.on('drain', function() {
    callback()
  })

  queueFlowSteps(q, workingFolder, environment, steps, currentProject, autoSave)
}

/**
 * queueFlowSteps
 * @param {Queue} queue to add steps to
 * @param {string} environment
 * @param {object} steps
 * @param {string} currentProject
 * @param {bool} autoSave
 */
function queueFlowSteps(q, workingFolder, environment, steps, currentProject, autoSave) {
  steps.forEach((stepDetails) => {
    q.push({stepDetails: stepDetails, environment: environment, workingFolder: workingFolder, currentProject: currentProject, autoSave: autoSave})
  })
}



//     const requestFile = files.findFile(workingFolder, stepDetails.request, 'requests', currentProject)
//     if (requestFile != null) {
//       q.push(executeQueuedRequest(workingFolder, environment, requestFile, currentProject, autoSave))

//       const spinner = new Ora('--> ' + stepDetails.request, 'clock').start()
//       request.executeRequest(workingFolder, environment, requestFile, currentProject, autoSave, function(result, response, captured) {
//         if (result.statusCode < 300) {
//           spinner.color = 'green'
//           spinner.succeed('--> ' + requestFile + ' ' + chalk.green(response))
//         } else if (result.statusCode > 300) {
//           spinner.fail('--> ' + requestFile + ' ' + chalk.red(response))
//         }
//         const newEnvironment = environment
//         for ( const key in captured ) {
//           if (captured.hasOwnProperty(key)) {
//             newEnvironment[key] = captured[key]
//           }
//         }

//         try {
//           if (stepDetails.nextSteps) {
//             executeFlowSteps(workingFolder, newEnvironment, stepDetails.nextSteps.steps, currentProject, autoSave, function() {
//             })
//           } else if (stepDetails.forEachSteps) {
//             newEnvironment[stepDetails.forEachSteps.environment].forEach((variable) => {
//               const childEnvironment = newEnvironment
//               childEnvironment[stepDetails.forEachSteps.environment] = variable
//               executeFlowSteps(workingFolder, childEnvironment, stepDetails.forEachSteps.steps, currentProject, autoSave, function() {
//               })
//             })
//           } else if (stepDetails.forEachFirstSteps) {
//             newEnvironment[stepDetails.forEachFirstSteps.environment][0].forEach((variable) => {
//               const childEnvironment = newEnvironment
//               childEnvironment[stepDetails.forEachFirstSteps.environment] = variable
//               executeFlowSteps(workingFolder, childEnvironment, stepDetails.forEachFirstSteps.steps, currentProject, autoSave, function() {
//               })
//             })
//           }
//         } catch (e) {
//           console.log('Exception processing completed request')
//           console.log(e)
//         }
//       })
//     } else {
//       console.log('unable to find request file ' + stepDetails.request)
//     }
//   })
//   callback()
// }

module.exports.executeFlowSteps = executeFlowSteps
