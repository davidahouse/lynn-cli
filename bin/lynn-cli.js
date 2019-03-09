#!/usr/bin/env node
const fs = require('fs')
const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const vorpal = require('vorpal')()
const Ora = require('ora')
const jp = require('jsonpath')
const conf = require('rc')('lynn', {
  // defaults
  workingFolder: process.env.HOME + '/.lynn',
  autoSave: false,
  interactive: true,
})

// Internal helpers
const files = require('../lib/files')
const environment = require('../lib/environment')
const request = require('../lib/request')
const flow = require('../lib/flow')
const generate = require('../lib/generate')
const schema = require('../lib/schema')

clear()
console.log(chalk.yellow(figlet.textSync('lynn', {horizontalLayout: 'full'})))

let currentProject = conf.project
let currentEnvironment = environment.gatherEnvironment(conf.workingFolder, conf.environment, currentProject)
let lastRequest = {}
let lastFlow = {}
let lastResult = {}

if (conf.interactive) {
  vorpal
      .command('request [file]', 'Execute a request')
      .option('-l, --last', 'Re-execute the last request')
      .autocomplete({
        data: function() {
          const found = files.listFiles(conf.workingFolder, 'requests', currentProject)
          return found
        },
      })
      .action(function(args, callback) {
        const spinner = new Ora('--> ' + args.file, 'clock').start()
        const file = args.options.last ? lastRequest : args.file
        const requestFile = files.findFile(conf.workingFolder, file, 'requests', currentProject)
        if (requestFile != null) {
          lastRequest = requestFile
          request.executeRequest(conf.workingFolder, currentEnvironment, requestFile, currentProject, conf.autoSave,
              function(result, response, captured) {
                if (result.statusCode) {
                  if (result.statusCode < 300) {
                    spinner.color = 'green'
                    spinner.succeed('--> ' + file + ' ' + chalk.green(response))
                  } else if (result.statusCode > 300) {
                    spinner.fail('--> ' + file + ' ' + chalk.red(response))
                  }
                } else {
                  spinner.fail('--> ' + file + ' ' + chalk.red(result.error))
                }
                lastResult = result
                for (const key in captured) {
                  if (captured.hasOwnProperty(key)) {
                    currentEnvironment[key] = captured[key]
                  }
                }
                callback()
              }
          )
        } else {
          spinner.fail(requestFile + ' request file not found!')
          callback()
        }
      })

  vorpal
      .command('flow [file]', 'Execute a request flow')
      .option('-l, --last', 'Re-execute the last flow')
      .autocomplete({
        data: function() {
          const found = files.listFiles(conf.workingFolder, 'flows', currentProject)
          return found
        },
      })
      .action(function(args, callback) {
        const file = args.options.last ? lastFlow : args.file
        const flowFile = files.findFile(conf.workingFolder, file, 'flows', currentProject)
        if (flowFile != null) {
          lastFlow = flowFile
          const flowContents = fs.readFileSync(flowFile)
          const flowDetails = JSON.parse(flowContents)
          flow.executeFlowSteps(conf.workingFolder, currentEnvironment,
              flowDetails.steps, currentProject, conf.autoSave, function() {
                callback()
              })
        } else {
          vorpal.log(vorpal.chalk.red(flowFile + ' flow file not found!'))
          callback()
        }
      })

  vorpal
      .command('project [project]', 'Select a project or display current project')
      .autocomplete({
        data: function() {
          return files.listProjects(conf.workingFolder)
        },
      })
      .action(function(args, callback) {
        if (args.project != null) {
          currentProject = args.project
        } else {
          vorpal.log(vorpal.chalk.yellow('Current project: ' + currentProject))
        }
        callback()
      })

  vorpal
      .command('environment [env]', 'Add to current environment or display current environment')
      .autocomplete({
        data: function() {
          return files.listFiles(conf.workingFolder, 'environment', currentProject)
        },
      })
      .action(function(args, callback) {
        if (args.env != null) {
          const envFile = files.findFile(conf.workingFolder, args.env, 'environment', currentProject)
          if (envFile != null) {
            const envContents = fs.readFileSync(envFile)
            const environment = JSON.parse(envContents)
            for (const key in environment) {
              if (environment.hasOwnProperty(key)) {
                currentEnvironment[key] = environment[key]
              }
            }
          }
        } else {
          for (const key in currentEnvironment) {
            if (currentEnvironment.hasOwnProperty(key)) {
              vorpal.log(vorpal.chalk.yellow(key + ': ' + currentEnvironment[key]))
            }
          }
        }
        callback()
      })

  vorpal
      .command('reset', 'Reset any saved config')
      .action(function(args, callback) {
        currentEnvironment = {}
        lastResult = {}
        lastRequest = {}
        vorpal.log('')
        callback()
      })

  vorpal
      .command('result [key]', 'View the contents of the last result')
      .action(function(args, callback) {
        if (args.key) {
          vorpal.log(vorpal.chalk.yellow(JSON.stringify(lastResult[args.key])))
        } else {
          for (const key in lastResult) {
            if (lastResult.hasOwnProperty(key)) {
              vorpal.log(vorpal.chalk.yellow(key + ':'))
              vorpal.log(vorpal.chalk.yellow(JSON.stringify(lastResult[key])))
            }
          }
        }
        callback()
      })

  vorpal
      .command('autoSave [save]', 'Turn on/off saving of responses')
      .action(function(args, callback) {
        if (args.save != null) {
          if (args.save === 'true') {
            conf.autoSave = true
          } else {
            conf.autoSave = false
          }
        } else {
          vorpal.log(vorpal.chalk.yellow('AutoSave enabled: ' + conf.autoSave))
        }
        callback()
      })

  vorpal
      .command('query <path>', 'Query the last result using jsonpath syntax')
      .action(function(args, callback) {
        vorpal.log(vorpal.chalk.yellow(JSON.stringify(jp.query(lastResult.data, args.path))))
        callback()
      })

  vorpal
      .command('set <variable> <value>', 'Set a value in the current environment')
      .action(function(args, callback) {
        currentEnvironment[args.variable] = args.value
        callback()
      })

  vorpal
      .command('generate', 'Generate the docs for this project')
      .action(function(args, callback) {
        generate.generateDocs(conf.workingFolder, currentProject, function() {
          vorpal.log(vorpal.chalk.yellow('Docs generated...'))
          callback()
        })
      })

  vorpal
      .command('schema', 'Generate the list of paths found in the result data json')
      .option('-d, --fordocs', 'Print out the schema for copy/pasting into the docs')
      .action(function(args, callback) {
        if (lastResult != null && lastResult.data != null) {
          schema.generateSchema(lastResult.data).forEach((path) => {
            if (args.options.fordocs) {
              vorpal.log(vorpal.chalk.
                  yellow('{ "path": "' + path + '", "description": "" , "dataType": "", "expectedValues", ""},'))
            } else {
              vorpal.log(vorpal.chalk.yellow(path))
            }
          })
        } else {
          vorpal.log(vorpal.chalk.yellow('No result found to map schema from'))
        }
        callback()
      })

  vorpal
      .command('matrix <request> <xaxis> <yaxis>',
          'Execute a series of requests with a combination of environment files')
      .action(function(args, callback) {
        const xaxis = args.xaxis.split(',')
        const yaxis = args.yaxis.split(',')
        const iterations = []
        xaxis.forEach((x) => {
          const envFile = files.findFile(conf.workingFolder, x, 'environment', currentProject)
          if (envFile != null) {
            const envContents = fs.readFileSync(envFile)
            const environment = JSON.parse(envContents)
            for (const key in environment) {
              if (environment.hasOwnProperty(key)) {
                currentEnvironment[key] = environment[key]
              }
            }
          }

          yaxis.forEach((y) => {
            const envFile = files.findFile(conf.workingFolder, y, 'environment', currentProject)
            if (envFile != null) {
              const envContents = fs.readFileSync(envFile)
              const environment = JSON.parse(envContents)
              for (const key in environment) {
                if (environment.hasOwnProperty(key)) {
                  currentEnvironment[key] = environment[key]
                }
              }
            }
            iterations.push(JSON.stringify(currentEnvironment))
          })
        })
        const requestFile = files.findFile(conf.workingFolder, args.request, 'requests', currentProject)
        if (requestFile != null) {
          request.executeIteration(conf.workingFolder, iterations, requestFile, currentProject, conf.autoSave, callback)
        } else {
          callback()
        }
      })

  vorpal
      .command('config', 'Show the current config')
      .action(function(args, callback) {
        vorpal.log(vorpal.chalk.yellow('Working Folder: ' + conf.workingFolder))
        if (currentProject) {
          vorpal.log(vorpal.chalk.yellow('Current Project: ' + currentProject))
        } else {
          vorpal.log(vorpal.chalk.yellow('No project set'))
        }
        vorpal.log(vorpal.chalk.yellow('Auto Save is ' + conf.autoSave))
        callback()
      })

  vorpal.delimiter('lynn-cli>').show()
} else {
  if (conf.request != null) {
    const spinner = new Ora('--> ' + conf.request, 'clock').start()
    const requestFile = files.findFile(conf.workingFolder, conf.request, 'requests', currentProject)
    if (requestFile != null) {
      request.executeRequest(conf.workingFolder, currentEnvironment, requestFile, currentProject, conf.autoSave,
          function(result, response, captured) {
            if (result.statusCode < 300) {
              spinner.color = 'green'
              spinner.succeed('--> ' + conf.request + ' ' + chalk.green(response))
            } else if (result.statusCode > 300) {
              spinner.fail('--> ' + conf.request + ' ' + chalk.red(response))
            }
            for (const key in captured) {
              if (captured.hasOwnProperty(key)) {
                currentEnvironment[key] = captured[key]
              }
            }
          }
      )
    } else {
      spinner.fail(requestFile + ' request file not found!')
    }
  } else if (conf.flow != null) {
    const flowFile = files.findFile(conf.workingFolder, conf.flow, 'flows', currentProject)
    if (flowFile != null) {
      const flowContents = fs.readFileSync(flowFile)
      const flowDetails = JSON.parse(flowContents)
      flow.executeFlowSteps(conf.workingFolder, currentEnvironment, flowDetails.steps,
          currentProject, conf.autoSave, function() {
          })
    } else {
      console.log(chalk.red(flowFile + ' flow file not found!'))
    }
  }
}
