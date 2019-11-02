const fs = require('fs');
const LynnRequest = require('lynn-request');
const mkdirp = require('mkdirp');
const dateFormat = require('dateformat');
const url = require('url');
const files = require('./files');
const yaml = require('js-yaml');
const jp = require('jsonpath');
const ptr = require('json-ptr');
const expand = require('expand-template')();

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
function executeOperation(
  workingFolder,
  environment,
  apiFile,
  operationName,
  currentProject,
  autoSave,
  callback
) {
  // Find the operation
  const operation = findPathUsingOperation(apiFile, operationName);

  // Convert the operation details into a request that we can execute via LynnRunner
  const request = {};
  request.options = {};
  request.title = operationName;
  request.options.protocol = constructProtocol(apiFile, environment);
  request.options.port = constructPort(
    apiFile,
    environment,
    request.options.protocol
  );
  request.options.method = operation.method.toUpperCase();
  request.options.host = constructHost(apiFile, environment);
  request.options.path = constructPath(apiFile, operation, environment);
  request.options.headers = constructParameters(
    operation,
    environment,
    'header'
  );
  request.options.queryString = constructParameters(
    operation,
    environment,
    'path'
  );
  request.options.auth = constructAuth(apiFile, operation, environment);
  request.options.form = constructForm(operation, environment);
  request.options.body = constructBody(operation, environment);

  const runner = new LynnRequest(request);
  runner.execute(function(result) {
    const response =
      request.title +
      ' [' +
      result.statusCode +
      '] ' +
      result.responseTime +
      'ms';
    if (autoSave == true) {
      // default location and name should be:
      // project/log/<request without .json>/<status code>_<date time>.json
      const projectPath = currentProject != null ? '/' + currentProject : '';
      const savePath =
        workingFolder + projectPath + '/log/' + request.title + '/';
      const timestamp =
        dateFormat(new Date(), 'yyyy_mm_dd_HH:MM:ss_l') +
        '_' +
        Math.floor(Math.random() * Math.floor(10));
      const saveFile = result.statusCode + '_' + timestamp + '.json';
      mkdirp(savePath, function(err) {
        fs.writeFileSync(savePath + saveFile, JSON.stringify(result, null, 2));
      });
    }
    callback(result, response);
  });
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
      const path = api.paths[pathKey];
      for (const pathOperation in path) {
        if (path.hasOwnProperty(pathOperation)) {
          if (path[pathOperation].operationId === operationName) {
            const pathObject = {};
            pathObject.path = pathKey;
            pathObject.method = pathOperation;
            pathObject.request = path[pathOperation];
            return pathObject;
          }
        }
      }
    }
  }
  return null;
}

/**
 * constructProtocol
 * @param {object} apiFile
 * @param {object} environment
 * @return {string} the protocol
 */
function constructProtocol(apiFile, environment) {
  if (environment['PROTOCOL'] != null) {
    return environment['PROTOCOL'];
  } else {
    if (
      apiFile.servers != null &&
      apiFile.servers.length > 0 &&
      apiFile.servers[0].url != null
    ) {
      const serverUrl = new url.URL(apiFile.servers[0].url);
      return serverUrl.protocol;
    } else {
      return '';
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
    return environment['PORT'];
  } else if (protocol === 'http:') {
    return '80';
  } else {
    return '443';
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
    return environment['HOST'];
  } else {
    if (
      apiFile.servers != null &&
      apiFile.servers.length > 0 &&
      apiFile.servers[0].url != null
    ) {
      const serverUrl = new url.URL(apiFile.servers[0].url);
      return serverUrl.host;
    } else {
      return '';
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
  const operationPath = operation.path;
  const queryStringStart = operationPath.indexOf('?');
  if (queryStringStart > 0) {
    return templateReplace(
      operationPath.substring(0, queryStringStart),
      environment
    );
  } else {
    return templateReplace(operationPath, environment);
  }
}

/**
 * constructParameters
 * @param {object} operation The swagger operation object
 * @param {object} environment The environment containing default values
 * @param {object} location Which type of parameters to construct: header, query for example
 * @return {object} the generated headers
 */
function constructParameters(operation, environment, location) {
  const params = {};
  if (operation.request.parameters != null) {
    operation.request.parameters.forEach(param => {
      if (param.in === location) {
        if (environment[param.name] != null) {
          params[param.name] = environment[param.name];
        } else if (param.schema != null && param.schema.default != null) {
          params[param.name] = templateReplace(
            param.schema.default,
            environment
          );
        }
      }
    });
  }
  return params;
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
  if (
    operation.request.security != null &&
    operation.request.security.length > 0
  ) {
    for (const key in operation.request.security[0]) {
      if (operation.request.security[0].hasOwnProperty(key)) {
        if (
          apiFile.components != null &&
          apiFile.components.securitySchemes != null
        ) {
          const securityScheme = apiFile.components.securitySchemes[key];
          if (securityScheme != null && securityScheme.scheme === 'basic') {
            return environment['USER'] + ':' + environment['PASSWORD'];
          }
        }
      }
    }
  }
  return null;
}

/**
 * constructForm
 * @param {object} operation The swagger operation object
 * @param {object} environment The environment containing default values
 * @return {object} the generated form object
 */
function constructForm(operation, environment) {
  let form = null;
  if (
    operation.request.requestBody != null &&
    operation.request.requestBody.content != null
  ) {
    if (operation.request.requestBody.content['multipart/form-data'] != null) {
      form = { fields: {}, files: {} };
      const properties =
        operation.request.requestBody.content['multipart/form-data'].schema
          .properties;
      for (const name in properties) {
        if (properties.hasOwnProperty(name)) {
          if (properties[name].format === 'binary') {
            form.files[name] = environment[name];
          } else {
            form.fields[name] = environment[name];
          }
        }
      }
    }
  }
  return form;
}

/**
 * constructBody
 * @param {object} operation The swagger operation object
 * @param {object} environment The environment containing default values
 * @return {object} the generated body object
 */
function constructBody(operation, environment) {
  let body = null;
  if (
    operation.request.requestBody != null &&
    operation.request.requestBody.content != null
  ) {
    if (operation.request.requestBody.content['application/json'] != null) {
      // If there is a $ref tag, we should use it. Otherwise the schema should have some properties
      if (
        operation.request.requestBody.content['application/json'].schema[
          '$ref'
        ] != null
      ) {
        const refContents = fs.readFileSync(
          operation.request.requestBody.content['application/json'].schema[
            '$ref'
          ]
        );
        body = JSON.parse(refContents);
      } else {
        body = {};
        const properties =
          operation.request.requestBody.content['application/json'].schema
            .properties;
        for (const name in properties) {
          if (properties.hasOwnProperty(name)) {
            if (name === '$ref') {
            } else {
              body[name] = properties[name].default;
            }
          }
        }
      }
    }
  }
  return body;
}

/**
 * templateReplace
 * @param {string} templateString The string containing the template
 * @param {object} templateVars The variables to possibly replace
 * @return {string} the replaced string
 */
function templateReplace(templateString, templateVars) {
  return expand(templateString, templateVars);
}

/**
 * gatherOperations
 * @param {string} workingFolder The working folder
 * @param {string} currentProject The current project (if any)
 * @return {object} The operations found
 */
function gatherOperations(workingFolder, currentProject) {
  const operations = {};
  const apiRootPath = files.rootPath(
    workingFolder,
    'operations',
    currentProject
  );
  const apiFiles = files.listFiles(workingFolder, 'operations', currentProject);
  apiFiles.forEach(apiFile => {
    const apiContents = parseApiFile(apiRootPath + '/' + apiFile);
    for (const pathKey in apiContents.paths) {
      if (apiContents.paths.hasOwnProperty(pathKey)) {
        const apiPath = apiContents.paths[pathKey];
        for (const pathOperation in apiPath) {
          if (apiPath.hasOwnProperty(pathOperation)) {
            const operationId = apiPath[pathOperation].operationId;
            if (operationId != null) {
              operations[operationId] = {
                kind: 'operation',
                file: apiFile,
                summary: apiPath[pathOperation].summary
              };
            }
          }
        }
      }
    }
  });
  return operations;
}

/**
 * parseApiFile
 * @param {string} filePath Api file to parse
 * @return {object} the api spec parsed from the file
 */
function parseApiFile(filePath) {
  const contents = fs.readFileSync(filePath);
  if (filePath.endsWith('json')) {
    return JSON.parse(contents);
  } else {
    return yaml.safeLoad(contents);
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
  const operation = findPathUsingOperation(apiFile, operationName);
  if (operation == null) {
    return;
  }

  const captured = {};
  for (const responseKey in operation.request.responses) {
    if (operation.request.responses.hasOwnProperty(responseKey)) {
      if (
        operation.request.responses[responseKey]['x-capture'] != null &&
        responseKey.toString() === result.statusCode.toString()
      ) {
        for (const key in operation.request.responses[responseKey][
          'x-capture'
        ]) {
          if (
            operation.request.responses[responseKey][
              'x-capture'
            ].hasOwnProperty(key)
          ) {
            captured[key] = capturedValue(
              operation.request.responses[responseKey]['x-capture'][key],
              result
            );
          }
        }
      }
    }
  }
  return captured;
}

/**
 * capturedValue
 * @param {string} jsonPointer
 * @param {object} result
 * @return {string} captured value
 */
function capturedValue(jsonPointer, result) {
  let found = null;
  try {
    if (jsonPointer.startsWith('$')) {
      const searchObject = { response: result };
      found = ptr.get(searchObject, jsonPointer.substring(1));
    } else if (jsonPointer.startsWith('?')) {
      found = jp.query(result.body, '$' + jsonPointer.substring(1));
    } else {
      found = ptr.get(result.body, jsonPointer);
    }
  } catch (e) {
    console.log('error capturing value: ' + e);
  }
  return found;
}

module.exports.executeOperation = executeOperation;
module.exports.gatherOperations = gatherOperations;
module.exports.parseApiFile = parseApiFile;
module.exports.capture = capture;
module.exports.capturedValue = capturedValue;
