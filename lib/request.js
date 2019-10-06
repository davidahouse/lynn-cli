const fs = require('fs')
const LynnRequest = require('lynn-request')
const mkdirp = require('mkdirp')
const dateFormat = require('dateformat')
const url = require('url')
const files = require('./files')
const yaml = require('js-yaml')
const jp = require('jsonpath')
const ptr = require('json-ptr')
const expand = require('expand-template')()

/**
 * executeRequest
 * @param {workingFolder} workingFolder
 * @param {string} environment dictionary
 * @param {string} apiFile name of the api file
 * @param {string} requestName name of the request
 * @param {string} currentProject
 * @param {bool} autoSave
 * @param {function} callback when request is complete
 */
function executeRequest(workingFolder, environment, requestFile, requestName, currentProject, autoSave, callback) {
  // Convert the request details into a request that we can execute via LynnRunner
  const request = {}
  request.options = {}
  request.title = requestName
  request.options.protocol = constructProtocol(requestFile, environment)
  request.options.port = constructPort(requestFile, environment, request.options.protocol)
  request.options.method = requestFile.method != null ? requestFile.method.toUpperCase() : 'get'
  request.options.host = constructHost(requestFile, environment)
  request.options.path = constructPath(requestFile, environment)
  request.options.headers = constructParameters(requestFile, environment, 'header')
  request.options.queryString = constructParameters(requestFile, environment, 'path')
  request.options.auth = constructAuth(requestFile, environment)
  request.options.form = constructForm(requestFile, environment)
  request.options.body = constructBody(requestFile, environment)

  const runner = new LynnRequest(request)
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
    callback(result, response)
  })
}

/**
 * constructProtocol
 * @param {object} requestFile
 * @param {object} environment
 * @return {string} the protocol
 */
function constructProtocol(requestFile, environment) {
  if (environment['PROTOCOL'] != null) {
    return environment['PROTOCOL']
  } else {
    if (requestFile.protocol != null) {
      return requestFile.protocol
    } else {
      return ''
    }
  }
}

/**
 * constructPort
 * @param {object} requestFile
 * @param {object} environment
 * @param {object} protocol
 * @return {string} the port
 */
function constructPort(requestFile, environment, protocol) {
  if (environment['PORT'] != null) {
    return environment['PORT']
  } else if (requestFile.port != null) {
    return requestFile.port
  } else if (protocol === 'http:') {
    return '80'
  } else {
    return '443'
  }
}

/**
 * constructHost
 * @param {object} requestFile
 * @param {object} environment
 * @return {string} the host
 */
function constructHost(requestFile, environment) {
  if (environment['HOST'] != null) {
    return environment['HOST']
  } else if (requestFile.host != null) {
    return requestFile.host
  } else {
    return ''
  }
}

/**
 * constructPath
 * @param {object} requestFile
 * @param {object} environment
 * @return {string} the path
 */
function constructPath(requestFile, environment) {
  // TODO:
  // Several cases we need to handle here:
  // - replacement values from the environment
  // - base path from the server (or BASEPATH from environment)
  const requestPath = requestFile.path
  const queryStringStart = requestPath.indexOf('?')
  if (queryStringStart > 0) {
    return templateReplace(requestPath.substring(0, queryStringStart), environment)
  } else {
    return templateReplace(requestPath, environment)
  }
}

/**
 * constructParameters
 * @param {object} requestFile The request object
 * @param {object} environment The environment containing default values
 * @param {object} location Which type of parameters to construct: header, query for example
 * @return {object} the generated headers
 */
function constructParameters(requestFile, environment, location) {
  const params = {}
  let locationParams = requestFile.headers
  if (location === 'path') {
    locationParams = requestFile.query
  }

  if (locationParams != null) {
    locationParams.forEach((param) => {
      if (environment[param.name] != null) {
        params[param.name] = environment[param.name]
      } else if (param.schema != null && param.schema.default != null) {
        params[param.name] = templateReplace(param.schema.default, environment)
      } else if (param.value != null) {
        params[param.name] = templateReplace(param.value.toString(), environment)
      }
    })
  }
  return params
}

/**
 * constructAuth
 * @param {object} requestFile the entire api file
 * @param {object} environment the environment to use to find auth credentials
 * @return {string} The auth string to use for this operation
 */
function constructAuth(requestFile, environment) {
  if (requestFile.auth === 'basic') {
    return environment['USER'] + ':' + environment['PASSWORD']
  } else {
    return null
  }
}

/**
 * constructForm
 * @param {object} requestFile The request object
 * @param {object} environment The environment containing default values
 * @return {object} the generated form object
 */
function constructForm(requestFile, environment) {
  const form = null
  // TODO: implement me!
  // if (operation.request.requestBody != null && operation.request.requestBody.content != null) {
  //   if (operation.request.requestBody.content['multipart/form-data'] != null) {
  //     form = {fields: {}, files: {}}
  //     const properties = operation.request.requestBody.content['multipart/form-data'].schema.properties
  //     for (const name in properties) {
  //       if (properties.hasOwnProperty(name)) {
  //         if (properties[name].format === 'binary') {
  //           form.files[name] = environment[name]
  //         } else {
  //           form.fields[name] = environment[name]
  //         }
  //       }
  //     }
  //   }
  // }
  return form
}

/**
 * constructBody
 * @param {object} requestFile The request file
 * @param {object} environment The environment containing default values
 * @return {object} the generated body object
 */
function constructBody(requestFile, environment) {
  const body = requestFile.body
  return body
}

/**
 * templateReplace
 * @param {string} templateString The string containing the template
 * @param {object} templateVars The variables to possibly replace
 * @return {string} the replaced string
 */
function templateReplace(templateString, templateVars) {
  return expand(templateString, templateVars)
}

/**
 * gatherRequests
 * @param {string} workingFolder The working folder
 * @param {string} currentProject The current project (if any)
 * @return {object} The requests found
 */
function gatherRequests(workingFolder, currentProject) {
  const requests = {}
  const apiRootPath = files.rootPath(workingFolder, 'requests', currentProject)
  const apiFiles = files.listFiles(workingFolder, 'requests', currentProject)
  apiFiles.forEach((apiFile) => {
    const apiContents = parseApiFile(apiRootPath + '/' + apiFile)
    requests[apiContents.requestId] = {kind: 'request', file: apiFile, summary: apiContents.summary}
  })
  return requests
}

/**
 * parseApiFile
 * @param {string} filePath Api file to parse
 * @return {object} the api spec parsed from the file
 */
function parseApiFile(filePath) {
  const contents = fs.readFileSync(filePath)
  if (filePath.endsWith('json')) {
    return JSON.parse(contents)
  } else {
    return yaml.safeLoad(contents)
  }
}

/**
 * capture
 * @param {object} apiFile The api spec object
 * @param {string} operationName The operation name
 * @param {object} result The result object
 * @return {object} the captured values
 */
function capture(apiFile, operationName, result) {
  // const operation = findPathUsingOperation(apiFile, operationName)
  // if (operation == null) {
  //   return
  // }

  const captured = {}
  // for (const responseKey in operation.request.responses) {
  //   if (operation.request.responses.hasOwnProperty(responseKey)) {
  //     if (operation.request.responses[responseKey]['x-capture'] != null && responseKey.toString() === result.statusCode.toString()) {
  //       for (const key in operation.request.responses[responseKey]['x-capture']) {
  //         if (operation.request.responses[responseKey]['x-capture'].hasOwnProperty(key)) {
  //           captured[key] = capturedValue(operation.request.responses[responseKey]['x-capture'][key], result)
  //         }
  //       }
  //     }
  //   }
  // }
  return captured
}

/**
 * capturedValue
 * @param {string} jsonPointer
 * @param {object} result
 * @return {string} captured value
 */
function capturedValue(jsonPointer, result) {
  let found = null
  try {
    if (jsonPointer.startsWith('$')) {
      const searchObject = {response: result}
      found = ptr.get(searchObject, jsonPointer.substring(1))
    } else if (jsonPointer.startsWith('?')) {
      found = jp.query(result.body, '$' + jsonPointer.substring(1))
    } else {
      found = ptr.get(result.body, jsonPointer)
    }
  } catch (e) {
    console.log('error capturing value: ' + e)
  }
  return found
}

module.exports.executeRequest = executeRequest
module.exports.gatherRequests = gatherRequests
module.exports.parseApiFile = parseApiFile
module.exports.capture = capture
module.exports.capturedValue = capturedValue
