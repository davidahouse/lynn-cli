#!/usr/bin/env node
const program = require('commander')
const fs = require('fs')
const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const vorpal = require('vorpal')()
const Ora = require('ora')
const jp = require('jsonpath')

// Internal helpers
const files = require('../lib/files')
const environment = require('../lib/environment')
const request = require('../lib/request')
const flow = require('../lib/flow')
const generate = require('../lib/generate')
const schema = require('../lib/schema')

program
    .version('0.1.0')
    .option('-p, --project <optional>', 'The project under .lynn to find the files in')
    .option('-r, --request <required>', 'Lynn Request to execute')
    .option('-f, --flow <required>', 'Lynn flow to execute')
    .option('-e, --environment <optional>', 'Environment files (comma separated list)')
    .option('-s, --save', 'Turn on auto-save')
    .option('-i, --interactive', 'Display the interactive mode')
    .option('-w, --workingFolder <required>', 'Set the working folder for where requests are found')
    .description('Lynn request runner')
    .parse(process.argv)


clear()
console.log(chalk.yellow(figlet.textSync('lynn', {horizontalLayout: 'full'})))

const workingFolder = program.workingFolder ? program.workingFolder : process.env.HOME + '/.lynn'
let currentProject = program.project
let currentEnvironment = environment.gatherEnvironment(workingFolder, program.environment, currentProject)
let lastRequest = {}
let lastFlow = {}
let lastResult = {}
let autoSave = program.save ? program.save : false

if (program.interactive) {
  vorpal
      .command('request [file]', 'Execute a request')
      .option('-l, --last', 'Re-execute the last request')
      .autocomplete({
        data: function() {
          const found = files.listFiles(workingFolder, 'requests', currentProject)
          return found
        },
      })
      .action(function(args, callback) {
        const self = this
        const spinner = new Ora('--> ' + args.file, 'clock').start()
        const file = args.options.last ? lastRequest : args.file
        const requestFile = files.findFile(workingFolder, file, 'requests', currentProject)
        if (requestFile != null) {
          lastRequest = requestFile
          request.executeRequest(workingFolder, currentEnvironment, requestFile, currentProject, autoSave,
              function(result, response, captured) {
                if (result.statusCode < 300) {
                  spinner.color = 'green'
                  spinner.succeed('--> ' + file + ' ' + chalk.green(response))
                } else if (result.statusCode > 300) {
                  spinner.fail('--> ' + file + ' ' + chalk.red(response))
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
          const found = files.listFiles(workingFolder, 'flows', currentProject)
          return found
        },
      })
      .action(function(args, callback) {
        const self = this
        const file = args.options.last ? lastFlow : args.file
        const flowFile = files.findFile(workingFolder, file, 'flows', currentProject)
        if (flowFile != null) {
          lastFlow = flowFile
          const flowContents = fs.readFileSync(flowFile)
          const flowDetails = JSON.parse(flowContents)
          flow.executeFlowSteps(workingFolder, currentEnvironment, flowDetails.steps, currentProject, autoSave, function() {
            callback()
          })
        } else {
          self.log(vorpal.chalk.red(flowFile + ' flow file not found!'))
          callback()
        }
      })

  vorpal
      .command('project [project]', 'Select a project or display current project')
      .autocomplete({
        data: function() {
          return files.listProjects(workingFolder)
        },
      })
      .action(function(args, callback) {
        if (args.project != null) {
          currentProject = args.project
        } else {
          this.log(vorpal.chalk.yellow('Current project: ' + currentProject))
        }
        callback()
      })

  vorpal
      .command('environment [env]', 'Add to current environment or display current environment')
      .autocomplete({
        data: function() {
          return files.listFiles(workingFolder, 'environment', currentProject)
        },
      })
      .action(function(args, callback) {
        if (args.env != null) {
          const envFile = files.findFile(workingFolder, args.env, 'environment', currentProject)
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
              this.log(vorpal.chalk.yellow(key + ': ' + currentEnvironment[key]))
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
        this.log('')
        callback()
      })

  vorpal
      .command('result [key]', 'View the contents of the last result')
      .action(function(args, callback) {
        if (args.key) {
          this.log(vorpal.chalk.yellow(JSON.stringify(lastResult[args.key])))
        } else {
          for (const key in lastResult) {
            if (lastResult.hasOwnProperty(key)) {
              this.log(vorpal.chalk.yellow(key + ':'))
              this.log(vorpal.chalk.yellow(JSON.stringify(lastResult[key])))
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
            autoSave = true
          } else {
            autoSave = false
          }
        } else {
          this.log(vorpal.chalk.yellow('AutoSave enabled: ' + autoSave))
        }
        callback()
      })

  vorpal
      .command('query <path>', 'Query the last result using jsonpath syntax')
      .action(function(args, callback) {
        this.log(vorpal.chalk.yellow(JSON.stringify(jp.query(lastResult.data, args.path))))
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
        const self = this
        generate.generateDocs(workingFolder, currentProject, function() {
          self.log(vorpal.chalk.yellow('Docs generated...'))
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
              this.log(vorpal.chalk.yellow('{ "path": "' + path + '", "description": "" },'))
            } else {
              this.log(vorpal.chalk.yellow(path))
            }
          })
        } else {
          this.log(vorpal.chalk.yellow('No result found to map schema from'))
        }
        callback()
      })

  vorpal
      .command('matrix <request> <xaxis> <yaxis>', 'Execute a series of requests with a combination of environment files')
      .action(function(args, callback) {
        const xaxis = args.xaxis.split(',')
        const yaxis = args.yaxis.split(',')
        const iterations = []
        xaxis.forEach((x) => {
          const envFile = files.findFile(workingFolder, x, 'environment', currentProject)
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
            const envFile = files.findFile(workingFolder, y, 'environment', currentProject)
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
        const requestFile = files.findFile(workingFolder, args.request, 'requests', currentProject)
        if (requestFile != null) {
          request.executeIteration(workingFolder, iterations, requestFile, currentProject, autoSave, callback)
        } else {
          callback()
        }
      })

  vorpal.delimiter('lynn-cli>').show()
} else {
  if (program.request != null) {
    const spinner = new Ora('--> ' + program.request, 'clock').start()
    const requestFile = files.findFile(workingFolder, program.request, 'requests', currentProject)
    if (requestFile != null) {
      request.executeRequest(workingFolder, currentEnvironment, requestFile, currentProject, autoSave,
          function(result, response, captured) {
            if (result.statusCode < 300) {
              spinner.color = 'green'
              spinner.succeed('--> ' + program.request + ' ' + chalk.green(response))
            } else if (result.statusCode > 300) {
              spinner.fail('--> ' + program.request + ' ' + chalk.red(response))
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
  } else if (program.flow != null) {
    const flowFile = files.findFile(workingFolder, program.flow, 'flows', currentProject)
    if (flowFile != null) {
      const flowContents = fs.readFileSync(flowFile)
      const flowDetails = JSON.parse(flowContents)
      flow.executeFlowSteps(workingFolder, currentEnvironment, flowDetails.steps, currentProject, autoSave, function() {
      })
    } else {
      console.log(chalk.red(flowFile + ' flow file not found!'))
    }
  }
}
