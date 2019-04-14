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
const schema = require('../lib/schema')
const operation = require('../lib/operation')

clear()
console.log(chalk.yellow(figlet.textSync('lynn', {horizontalLayout: 'full'})))
console.log(chalk.yellow(module.exports.version))

let currentProject = conf.project
let currentEnvironment = environment.gatherEnvironment(conf.workingFolder, conf.environment, currentProject)
let lastFlow = {}
let lastResponse = {}
const requests = operation.gatherOperations(conf.workingFolder, currentProject)
const projectInfo = files.projectFileContents(conf.workingFolder, currentProject)
if (projectInfo != null && projectInfo.title != null) {
  console.log(chalk.yellow(projectInfo.title))
}

if (projectInfo != null && projectInfo.description != null) {
  console.log(chalk.yellow(projectInfo.description))
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
        callback()
      })

  vorpal
      .command('generate', 'Generate the docs for this project')
      .action(function(args, callback) {
        vorpal.log(vorpal.chalk.yellow('This ride is undergoing renovation, please come back once the work is completed!'))
        callback()
        // generate.generateDocs(conf.workingFolder, currentProject, function() {
        //   vorpal.log(vorpal.chalk.yellow('Docs generated...'))
        //   callback()
        // })
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
        vorpal.log(vorpal.chalk.yellow('Sorry the Matrix is currently offline. Are you The One?'))

        // TODO: Convert over to using the operation api and figure out how to handle iterations
        // const xaxis = args.xaxis.split(',')
        // const yaxis = args.yaxis.split(',')
        // const iterations = []
        // xaxis.forEach((x) => {
        //   const envFile = files.findFile(conf.workingFolder, x, 'environment', currentProject)
        //   if (envFile != null) {
        //     const envContents = fs.readFileSync(envFile)
        //     const environment = JSON.parse(envContents)
        //     for (const key in environment) {
        //       if (environment.hasOwnProperty(key)) {
        //         currentEnvironment[key] = environment[key]
        //       }
        //     }
        //   }

        //   yaxis.forEach((y) => {
        //     const envFile = files.findFile(conf.workingFolder, y, 'environment', currentProject)
        //     if (envFile != null) {
        //       const envContents = fs.readFileSync(envFile)
        //       const environment = JSON.parse(envContents)
        //       for (const key in environment) {
        //         if (environment.hasOwnProperty(key)) {
        //           currentEnvironment[key] = environment[key]
        //         }
        //       }
        //     }
        //     currentEnvironment['MATRIXTITLE'] = x + ',' + y
        //     iterations.push(JSON.stringify(currentEnvironment))
        //   })
        // })
        // const requestFile = files.findFile(conf.workingFolder, args.request, 'requests', currentProject)
        // if (requestFile != null) {
        //   request.executeIteration(conf.workingFolder, iterations, requestFile, currentProject, conf.autoSave, callback)
        // } else {
        //   callback()
        // }
        callback()
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
                spinner.succeed('--> ' + args.name + ' ' + chalk.green(response))
              } else if (result.statusCode > 300) {
                spinner.fail('--> ' + args.name + ' ' + chalk.red(response))
              }
            } else {
              spinner.fail('--> ' + args.name + ' ' + chalk.red(result.error))
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

  vorpal.delimiter('lynn-cli>').show()
} else {
  if (conf.request != null) {
    // TODO: Convert over to the operation api
    // const spinner = new Ora('--> ' + conf.request, 'clock').start()
    // const requestFile = files.findFile(conf.workingFolder, conf.request, 'requests', currentProject)
    // if (requestFile != null) {
    //   request.executeRequest(conf.workingFolder, currentEnvironment, requestFile, currentProject, conf.autoSave,
    //       function(result, response, captured) {
    //         if (result.statusCode < 300) {
    //           spinner.color = 'green'
    //           spinner.succeed('--> ' + conf.request + ' ' + chalk.green(response))
    //         } else if (result.statusCode > 300) {
    //           spinner.fail('--> ' + conf.request + ' ' + chalk.red(response))
    //         }
    //         for (const key in captured) {
    //           if (captured.hasOwnProperty(key)) {
    //             currentEnvironment[key] = captured[key]
    //           }
    //         }
    //       }
    //   )
    // } else {
    //   spinner.fail(requestFile + ' request file not found!')
    // }
  }
}
