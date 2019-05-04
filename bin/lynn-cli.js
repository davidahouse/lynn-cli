#!/usr/bin/env node
const fs = require('fs')
const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const vorpal = require('vorpal')()
const Ora = require('ora')
const jp = require('jsonpath')
const ptr = require('json-ptr')
var pkginfo = require('pkginfo')(module)
const Queue = require('better-queue')
const conf = require('rc')('lynn', {
  // defaults
  workingFolder: process.env.HOME + '/.lynn',
  autoSave: false,
  interactive: true,
})

// Internal helpers
const files = require('../lib/files')
const environment = require('../lib/environment')
const generate = require('../lib/generate')
const operation = require('../lib/operation')

clear()
console.log(chalk.yellow(figlet.textSync('lynn', {horizontalLayout: 'full'})))
console.log(chalk.yellow(module.exports.version))

let currentProject = conf.project
let currentEnvironment = environment.gatherEnvironment(conf.workingFolder, conf.environment, currentProject)
let lastResponse = {}
const requests = operation.gatherOperations(conf.workingFolder, currentProject)
const projectInfo = files.projectFileContents(conf.workingFolder, currentProject)
if (projectInfo != null && projectInfo.title != null) {
  console.log(chalk.yellow(projectInfo.title))
}

if (projectInfo != null && projectInfo.description != null) {
  console.log(chalk.yellow(projectInfo.description))
}

// Handle bool conf values from the command line (or other places)
if (conf.interactive === 'false') {
  conf.interactive = false
}
if (conf.autoSave === 'true') {
  conf.autoSave = true
}

if (conf.interactive) {
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
        lastResponse = {}
        lastRequest = {}
        vorpal.log('')
        callback()
      })

  vorpal
      .command('response [key]', 'View the contents of the last response')
      .action(function(args, callback) {
        if (args.key) {
          vorpal.log(vorpal.chalk.yellow(JSON.stringify(lastResponse[args.key])))
        } else {
          for (const key in lastResponse) {
            if (lastResponse.hasOwnProperty(key)) {
              vorpal.log(vorpal.chalk.yellow(key + ':'))
              vorpal.log(vorpal.chalk.yellow(JSON.stringify(lastResponse[key])))
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
      .command('query <path>', 'Query the last response using jsonpath syntax')
      .action(function(args, callback) {
        // Support three kinds of query here:
        // default is just a JSON pointer query into the response data
        // second if the user starts the query with $ then we do a full query across
        // entire response object
        // third if the user starts the query with ? then we perform a JSON path query
        let found = null
        try {
          if (args.path.startsWith('$')) {
            const searchObject = {response: lastResponse}
            found = ptr.get(searchObject, args.path.substring(1))
          } else if (args.path.startsWith('?')) {
            found = jp.query(lastResponse.body, '$' + args.path.substring(1))
          } else {
            found = ptr.get(lastResponse.body, args.path)
          }
          vorpal.log(vorpal.chalk.yellow(JSON.stringify(found)))
        } catch (e) {
          vorpal.log(vorpal.chalk.red('Error performing query ' + e))
        }
        callback()
      })

  vorpal
      .command('set <variable> <value>', 'Set a value in the current environment')
      .action(function(args, callback) {
        currentEnvironment[args.variable] = args.value
        vorpal.log(vorpal.chalk.yellow(args.variable + ' set to ' + args.value))
        callback()
      })

  vorpal
      .command('setArray <variable>', 'Make an entry in the environment an empty array')
      .action(function(args, callback) {
        currentEnvironment[args.variable] = []
        vorpal.log(vorpal.chalk.yellow(args.variable + ' set to an empty array'))
        callback()
      })

  vorpal
      .command('append <variable> <value>', 'Appends a value to an existing array')
      .action(function(args, callback) {
        if (currentEnvironment[args.variable] != null && Array.isArray(currentEnvironment[args.variable])) {
          currentEnvironment[args.variable].push(args.value)
          vorpal.log(vorpal.chalk.yellow('Appended ' + args.value + ' to array ' + args.variable))
        } else {
          vorpal.log(vorpal.chalk.red(args.variable + ' is not an array, unable to append'))
        }
        callback()
      })

  vorpal
      .command('generate', 'Generate the docs for this project')
      .action(function(args, callback) {
        const rootPath = files.rootPath(conf.workingFolder, 'requests', currentProject)
        const summaries = []
        for (const key in requests) {
          if (requests.hasOwnProperty(key)) {
            const apiFile = operation.parseApiFile(rootPath + '/' + requests[key].file)
            summaries.push(generate.generateDocs(conf.workingFolder, key, apiFile, currentProject))
            console.log(chalk.green('✅ --> ' + key + ' doc generated'))
          }
        }
        generate.generateReadme(conf.workingFolder, currentProject, summaries)
        console.log(chalk.green('✅ --> Readme.md generated'))
        callback()
      })

  vorpal
      .command('schema', 'Generate the list of paths found in the response data json')
      .option('-d, --fordocs', 'Print out the schema for copy/pasting into the docs')
      .action(function(args, callback) {
        if (lastResponse != null && lastResponse.body != null) {
          const schema = ptr.flatten(lastResponse.body)
          for (const key in schema) {
            if (schema.hasOwnProperty(key) && key != '') {
              vorpal.log(vorpal.chalk.yellow(key))
            }
          }
        } else {
          vorpal.log(vorpal.chalk.yellow('No response found to map schema from'))
        }
        callback()
      })

  vorpal
      .command('matrix <request> <xaxis> <yaxis>',
          'Execute a series of requests with a combination of environment files')
      .action(function(args, callback) {
        const xaxis = args.xaxis.split(',')
        const yaxis = args.yaxis.split(',')

        const rootPath = files.rootPath(conf.workingFolder, 'requests', currentProject)
        const apiFile = operation.parseApiFile(rootPath + '/' + requests[args.request].file)
        if (apiFile == null) {
          callback()
          return
        }

        const q = new Queue(function(iteration, cb) {
          const spinner = new Ora('--> ' + args.request, 'clock').start()

          const xFile = files.findFile(conf.workingFolder, iteration.x, 'environment', currentProject)
          if (xFile != null) {
            const envContents = fs.readFileSync(xFile)
            const environment = JSON.parse(envContents)
            for (const key in environment) {
              if (environment.hasOwnProperty(key)) {
                currentEnvironment[key] = environment[key]
              }
            }
          }

          const yFile = files.findFile(conf.workingFolder, iteration.y, 'environment', currentProject)
          if (yFile != null) {
            const envContents = fs.readFileSync(yFile)
            const environment = JSON.parse(envContents)
            for (const key in environment) {
              if (environment.hasOwnProperty(key)) {
                currentEnvironment[key] = environment[key]
              }
            }
          }

          operation.executeOperation(conf.workingFolder, currentEnvironment, apiFile, args.request, currentProject, conf.autoSave, function(result, response) {
            if (result.statusCode) {
              if (result.statusCode < 300) {
                spinner.color = 'green'
                spinner.succeed('--> ' +  chalk.green(response))
              } else if (result.statusCode > 300) {
                spinner.fail('--> ' + chalk.red(response))
              }
            } else {
              spinner.fail('--> ' + chalk.red(result.error))
            }
            lastResponse = result
            const capturedValues = operation.capture(apiFile, args.name, result)
            for (const key in capturedValues) {
              if (capturedValues.hasOwnProperty(key)) {
                currentEnvironment[key] = capturedValues[key]
              }
            }
            cb()
          })
        })

        q.on('drain', function() {
          callback()
        })

        xaxis.forEach((x) => {
          yaxis.forEach((y) => {
            q.push({x: x, y: y})
          })
        })
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
  vorpal
      .command('requests', 'List all the requests available')
      .action(function(args, callback) {
        for (const key in requests) {
          if (requests.hasOwnProperty(key)) {
            vorpal.log(vorpal.chalk.yellow(key) + ' - ' + requests[key].summary)
          }
        }
        callback()
      })
  vorpal
      .command('request <name>', 'Execute a request inside an OpenAPI spec')
      .autocomplete({
        data: function() {
          return Object.keys(requests)
        },
      })
      .action(function(args, callback) {
        if (requests[args.name] == null) {
          vorpal.log(vorpal.chalk.red('Request ' + args.name + ' not found'))
          callback()
          return
        }

        const spinner = new Ora('--> ' + args.name, 'clock').start()
        const rootPath = files.rootPath(conf.workingFolder, 'requests', currentProject)
        const apiFile = operation.parseApiFile(rootPath + '/' + requests[args.name].file)
        if (apiFile != null) {
          operation.executeOperation(conf.workingFolder, currentEnvironment, apiFile, args.name, currentProject, conf.autoSave, function(result, response) {
            if (result.statusCode) {
              if (result.statusCode < 300) {
                spinner.color = 'green'
                spinner.succeed('--> ' + chalk.green(response))
              } else if (result.statusCode > 300) {
                spinner.fail('--> ' + chalk.red(response))
              }
            } else {
              spinner.fail('--> ' + chalk.red(result.error))
            }
            lastResponse = result
            const capturedValues = operation.capture(apiFile, args.name, result)
            for (const key in capturedValues) {
              if (capturedValues.hasOwnProperty(key)) {
                currentEnvironment[key] = capturedValues[key]
              }
            }
            callback()
          })
        }
      })
  vorpal
      .command('forEach <variable> <request>', 'Execute a series of requests based on an environment variable array')
      .autocomplete({
        data: function() {
          return Object.keys(requests).concat(Object.keys(currentEnvironment))
        },
      })
      .action(function(args, callback) {
        if (requests[args.request] == null) {
          vorpal.log(vorpal.chalk.red('Request ' + args.request + ' not found'))
          callback()
          return
        }

        if (currentEnvironment[args.variable] == null) {
          vorpal.log(vorpal.chalk.red('Environment does not contain ' + args.variable))
          callback()
          return
        } else if (!Array.isArray(currentEnvironment[args.variable])) {
          vorpal.log(vorpal.chalk.red(args.variable + ' is not an array'))
          callback()
          return
        }

        const rootPath = files.rootPath(conf.workingFolder, 'requests', currentProject)
        const apiFile = operation.parseApiFile(rootPath + '/' + requests[args.request].file)
        if (apiFile == null) {
          vorpal.log(vorpal.chalk.red('Unable to load request'))
          callback()
          return
        }

        const savedEnvironmentValues = currentEnvironment[args.variable]
        const q = new Queue(function(currentValue, cb) {
          const spinner = new Ora('--> ' + args.request, 'clock').start()
          currentEnvironment[args.variable] = currentValue
          operation.executeOperation(conf.workingFolder, currentEnvironment, apiFile, args.request, currentProject, conf.autoSave, function(result, response) {
            if (result.statusCode) {
              if (result.statusCode < 300) {
                spinner.color = 'green'
                spinner.succeed('--> ' +  chalk.green(response))
              } else if (result.statusCode > 300) {
                spinner.fail('--> ' + chalk.red(response))
              }
            } else {
              spinner.fail('--> ' + chalk.red(result.error))
            }
            lastResponse = result
            const capturedValues = operation.capture(apiFile, args.name, result)
            for (const key in capturedValues) {
              if (capturedValues.hasOwnProperty(key)) {
                currentEnvironment[key] = capturedValues[key]
              }
            }
            cb()
          })
        })

        q.on('drain', function() {
          currentEnvironment[args.variable] = savedEnvironmentValues
          callback()
        })

        savedEnvironmentValues.forEach((currentValue) => {
          q.push(currentValue)
        })
      })

  vorpal.delimiter('lynn-cli>').show()
} else {
  if (conf.request != null) {
    const spinner = new Ora('--> ' + conf.request, 'clock').start()
    const rootPath = files.rootPath(conf.workingFolder, 'requests', currentProject)
    const apiFile = operation.parseApiFile(rootPath + '/' + requests[conf.request].file)
    if (apiFile != null) {
      operation.executeOperation(conf.workingFolder, currentEnvironment, apiFile, conf.request, currentProject, conf.autoSave, function(result, response) {
        if (result.statusCode) {
          if (result.statusCode < 300) {
            spinner.color = 'green'
            spinner.succeed('--> ' + chalk.green(response))
          } else if (result.statusCode > 300) {
            spinner.fail('--> ' + chalk.red(response))
          }
        } else {
          spinner.fail('--> ' + chalk.red(result.error))
        }
      })
    } else {
      spinner.fail('--> ' + chalk.red('request not found'))
    }
  }
}
