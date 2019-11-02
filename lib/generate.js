const path = require('path');
const files = require('./files');
const fs = require('fs');

/**
 * generateDocs
 * @param {string} workingFolder
 * @param {function} callback
 */
function generateDocs(workingFolder, request, requestFile) {
  return generateRequest(workingFolder, request, requestFile);
}

/**
 * generateReadme
 * @param {string} workingFolder
 * @param {array} summaries
 */
function generateReadme(workingFolder, summaries) {
  const contents = [];
  const projectDetails = files.projectFileContents(workingFolder);

  contents.push('## ' + projectDetails.title + ' API docs');
  contents.push(' ');
  contents.push(projectDetails.description);
  contents.push(' ');
  contents.push('## Requests');
  contents.push(' ');
  contents.push('| Request | Path | Summary |');
  contents.push('| ------- | ---- | ------- |');
  summaries.forEach(summary => {
    contents.push(summary);
  });
  contents.push(' ');
  contents.push('Generated on: ' + new Date());

  files.createFile(workingFolder, 'docs', 'README.md', contents.join('\n'));
}

/**
 * generateRequest
 * @param {string} workingFolder
 * @param {string} request
 */
function generateRequest(workingFolder, request, requestFile) {
  const requestPath = findPathUsingOperation(requestFile, request);

  const contents = [];
  contents.push('## ' + request);
  contents.push(' ');
  contents.push('## Description');
  contents.push(requestFile.info.description);
  contents.push(' ');
  contents.push('### Path');
  contents.push(requestPath.path);
  contents.push(requestPath.method);
  contents.push(requestPath.request.summary);
  contents.push(' ');
  contents.push('### Headers');
  contents.push(' ');
  contents.push('| Header | Value | Description |');
  contents.push('|--------|-------|-------------|');
  if (requestPath.request.parameters) {
    requestPath.request.parameters.forEach(param => {
      if (param.in == 'header') {
        contents.push(
          '| ' +
            param.name +
            ' | ' +
            param.schema.default +
            ' | ' +
            (param.required ? 'Required' : '') +
            ' ' +
            param.schema.type +
            ' | '
        );
      }
    });
  }
  contents.push(' ');
  contents.push('### Parameters');
  contents.push(' ');
  contents.push('| Parameter | Value | Description |');
  contents.push('|--------|-------|-------------|');
  if (requestPath.request.parameters) {
    requestPath.request.parameters.forEach(param => {
      if (param.in == 'path') {
        contents.push(
          '| ' +
            param.name +
            ' | ' +
            param.schema.default +
            ' | ' +
            (param.required ? 'Required' : '') +
            ' ' +
            param.schema.type +
            ' | '
        );
      }
    });
  }
  contents.push(' ');
  contents.push('### Responses');
  contents.push(' ');
  if (requestPath.request.responses) {
    for (const response in requestPath.request.responses) {
      if (requestPath.request.responses.hasOwnProperty(response)) {
        const responseDetails = requestPath.request.responses[response];
        contents.push('### ' + response);
        contents.push(responseDetails.description);
      }
    }
  }
  contents.push(' ');

  files.createFile(workingFolder, 'docs', request + '.md', contents.join('\n'));

  // Return a summary for the README.md
  return (
    '| [' +
    request +
    '](' +
    request +
    '.md) | ' +
    requestPath.path +
    ' | ' +
    requestPath.request.summary +
    ' | '
  );
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

module.exports.generateDocs = generateDocs;
module.exports.generateReadme = generateReadme;
