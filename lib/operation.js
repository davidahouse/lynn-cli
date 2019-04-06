const fs = require('fs')
const LynnRunner = require('@davidahouse/lynn')
const mkdirp = require('mkdirp')
const dateFormat = require('dateformat')
const Ora = require('ora')
const chalk = require('chalk')
const url = require('url')
const files = require('./files')

/**
 * executeOperation
 * @param {workingFolder} workingFolder
 * @param {string} environment dictionary
 * @param {string} apiFile name of the api file
 * @param {string} operationName name of the operation
 * @param {string} currentProject
 * @param {bool} autoSave
 * @param {function} callback when request is complete
 */
function executeOperation(workingFolder, environment, apiFile, operationName, currentProject, autoSave, callback) {
  // Find the operation
  const operation = findPathUsingOperation(apiFile, operationName)

  // const requestContents = fs.readFileSync(requestFile)
  // const request = JSON.parse(requestContents)
  // const requestEnvironment = environmentWithDefaults(request, environment)
  // if (!validEnvironment(request, requestEnvironment)) {
  //   callback({error: 'Missing one or more required envionment variables: ' + request.parameters.required})
  //   return
  // }

  // Convert the operation details into a request that we can execute via LynnRunner
  const request = {}
  request.options = {}
  request.title = operationName
  request.options.protocol = constructProtocol(apiFile, environment)
  request.options.port = constructPort(apiFile, environment, request.options.protocol)
  request.options.method = operation.method.toUpperCase()
  request.options.host = constructHost(apiFile, environment)
  request.options.path = constructPath(apiFile, operation, environment)
  request.options.headers = constructParameters(operation, environment, 'header')
  request.options.queryString = constructParameters(operation, environment, 'path')
  request.options.auth = constructAuth(apiFile, operation, environment)
  console.log(JSON.stringify(request))

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
 * findPathUsingOperation
 * @param {object} api the api object to scan
 * @param {string} operationName the operation name
 * @return {object} Return path object or null
 */
function findPathUsingOperation(api, operationName) {
  for (const pathKey in api.paths) {
    if (api.paths.hasOwnProperty(pathKey)) {
      const path = api.paths[pathKey]
      for (const pathOperation in path) {
        if (path.hasOwnProperty(pathOperation)) {
          if (path[pathOperation].operationId === operationName) {
            const pathObject = {}
            pathObject.path = pathKey
            pathObject.method = pathOperation
            pathObject.request = path[pathOperation]
            return pathObject
          }
        }
      }
    }
  }
  return null
}

/**
 * constructProtocol
 * @param {object} apiFile
 * @param {object} environment
 * @return {string} the protocol
 */
function constructProtocol(apiFile, environment) {
  if (environment['PROTOCOL'] != null) {
    return environment['PROTOCOL']
  } else {
    if (apiFile.servers != null && apiFile.servers.length > 0 && apiFile.servers[0].url != null) {
      const serverUrl = new url.URL(apiFile.servers[0].url)
      return serverUrl.protocol
    } else {
      return ''
    }
  }
}

/**
 * constructPort
 * @param {object} apiFile
 * @param {object} environment
 * @param {object} protocol
 * @return {string} the port
 */
function constructPort(apiFile, environment, protocol) {
  if (environment['PORT'] != null) {
    return environment['PORT']
  } else if (protocol === 'http:') {
    return '80'
  } else {
    return '443'
  }
}

/**
 * constructHost
 * @param {object} apiFile
 * @param {object} environment
 * @return {string} the host
 */
function constructHost(apiFile, environment) {
  if (environment['HOST'] != null) {
    return environment['HOST']
  } else {
    if (apiFile.servers != null && apiFile.servers.length > 0 && apiFile.servers[0].url != null) {
      const serverUrl = new url.URL(apiFile.servers[0].url)
      return serverUrl.host
    } else {
      return ''
    }
  }
}

/**
 * constructPath
 * @param {object} apiFile
 * @param {object} operation
 * @param {object} environment
 * @return {string} the path
 */
function constructPath(apiFile, operation, environment) {
  // TODO:
  // Several cases we need to handle here:
  // - replacement values from the environment
  // - base path from the server (or BASEPATH from environment)
  return operation.path
}

/**
 * constructParameters
 * @param {object} operation The swagger operation object
 * @param {object} environment The environment containing default values
 * @param {object} location Which type of parameters to construct: header, query for example
 * @return {object} the generated headers
 */
function constructParameters(operation, environment, location) {
  const params = {}
  operation.request.parameters.forEach((param) => {
    if (param.in === location) {
      if (environment[param.name] != null) {
        params[param.name] = environment[param.name]
      } else if (param.schema != null && param.schema.default != null) {
        params[param.name] = templateReplace(param.schema.default, environment)
      }
    }
  })
  return params
}

/**
 * constructAuth
 * @param {object} apiFile the entire api file
 * @param {object} operation the operation to check for auth settings on
 * @param {object} environment the environment to use to find auth credentials
 * @return {string} The auth string to use for this operation
 */
function constructAuth(apiFile, operation, environment) {
  // TODO:
  // Lots of cases to handle here, but for starters we will just look
  // for basicAuth. This needs to be modified to work along with the openapi spec
  // where the auth types are defined at one level, then the operation indicates
  // which auth we are using (if any)
  if (operation.request.security != null && operation.request.security.length > 0) {
    for (const key in operation.request.security[0]) {
      if (operation.request.security[0].hasOwnProperty(key)) {
        if (apiFile.components != null && apiFile.components.securitySchemes != null) {
          const securityScheme = apiFile.components.securitySchemes[key]
          if (securityScheme != null && securityScheme.scheme === 'basic') {
            return environment['USER'] + ':' + environment['PASSWORD']
          }
        }
      }
    }
  }
  return null
}

/**
 * templateReplace
 * @param {string} templateString The string containing the template
 * @param {object} templateVars The variables to possibly replace
 * @return {string} the replaced string
 */
function templateReplace(templateString, templateVars) {
  return new Function('return `'+templateString +'`;').call(templateVars)
}

/**
 * gatherOperations
 * @param {string} workingFolder The working folder
 * @param {string} currentProject The current project (if any)
 * @return {object} The operations found
 */
function gatherOperations(workingFolder, currentProject) {
  const operations = {}
  const apiFiles = files.listFiles(workingFolder, 'api', currentProject)
  apiFiles.forEach((apiFile) => {
//    const apiContents = parseApiFile(apiFile)
    console.log(apiFile)
  })
  return operations
}

module.exports.executeOperation = executeOperation
module.exports.gatherOperations = gatherOperations
