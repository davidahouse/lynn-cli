const path = require('path')
const files = require('./files')
const fs = require('fs')

/**
 * generateDocs
 * @param {string} workingFolder
 * @param {string} currentProject
 * @param {function} callback
 */
function generateDocs(workingFolder, currentProject, callback) {
  const requestFiles = files.listFiles(workingFolder, 'requests', currentProject)
  generateReadme(workingFolder, currentProject, requestFiles)
  requestFiles.forEach((request) => {
    generateRequest(workingFolder, currentProject, request)
  })
  callback()
}

/**
 * generateReadme
 * @param {string} workingFolder
 * @param {string} currentProject
 * @param {array} requestFiles
 */
function generateReadme(workingFolder, currentProject, requestFiles) {
  console.log('generate readme')
  const contents = []
  const projectDetails = files.projectFileContents(workingFolder, currentProject)

  contents.push('## ' + projectDetails.title + ' API docs')
  contents.push(' ')
  contents.push(projectDetails.description)
  contents.push(' ')
  contents.push('## Requests')
  contents.push(' ')

  const uncategorized = []
  const categories = {}
  requestFiles.forEach((request) => {
    const requestFile = files.findFile(workingFolder, request, 'requests', currentProject)
    const requestContents = fs.readFileSync(requestFile)
    const requestDetails = JSON.parse(requestContents)

    const requestInfo = '| [' + path.basename(request, '.json') +
    '](docs/' + path.basename(request, '.json') + '.md)' +
    ' | ' + requestDetails.description + ' |'

    if (requestDetails.category != null) {
      if (categories[requestDetails.category] == null) {
        categories[requestDetails.category] = [requestInfo]
      } else {
        categories[requestDetails.category].push(requestInfo)
      }
    } else {
      uncategorized.push(requestInfo)
    }
  })

  if (uncategorized.length > 0) {
    contents.push('| Endpoint | Description |')
    contents.push('|----------|-------------|')
    uncategorized.forEach((request) => {
      contents.push(request)
    })
    contents.push(' ')
  }

  for (const key in categories) {
    if (categories.hasOwnProperty(key)) {
      contents.push('### ' + key)
      contents.push(' ')
      contents.push('| Endpoint | Description |')
      contents.push('|----------|-------------|')
      categories[key].forEach((request) => {
        contents.push(request)
      })
      contents.push(' ')
    }
  }

  files.createFile(workingFolder, currentProject, null, 'README.md', contents.join('\n'))
}

/**
 * generateRequest
 * @param {string} workingFolder
 * @param {string} currentProject
 * @param {string} request
 */
function generateRequest(workingFolder, currentProject, request) {
  console.log('generate request: ' + request)
  const requestFile = files.findFile(workingFolder, request, 'requests', currentProject)
  const requestContents = fs.readFileSync(requestFile)
  const requestDetails = JSON.parse(requestContents)

  const contents = []
  contents.push('## ' + requestDetails.title)
  contents.push(' ')
  contents.push('## Description')
  contents.push(requestDetails.description)
  contents.push(' ')
  contents.push('### Path')
  contents.push(requestDetails.options.path)
  contents.push(' ')
  contents.push('### Headers')
  contents.push(' ')
  contents.push('| Header | Value | Description |')
  contents.push('|--------|-------|-------------|')
  for (const key in requestDetails.options.headers) {
    if (requestDetails.options.headers.hasOwnProperty(key)) {
      let description = ''
      if (requestDetails.docs != null &&
              requestDetails.docs.headers != null &&
              requestDetails.docs.headers[key] != null) {
        description = requestDetails.docs.headers[key]
      }
      contents.push('| ' + key + ' | ' + requestDetails.options.headers[key] + ' | ' + description + ' | ')
    }
  }
  contents.push(' ')
  contents.push('### Request')
  contents.push('[' + path.basename(request, '.json') + '](../requests/' + request +')')
  contents.push(' ')
  contents.push('### Responses')
  contents.push(' ')
  if (requestDetails.responses) {
    requestDetails.responses.forEach((responses) => {
      for (const statusCode in responses) {
        if (responses.hasOwnProperty(statusCode)) {
          contents.push('### ' + statusCode)
          responses[statusCode].forEach((response) => {
            contents.push('- [' + response.description + '](../responses/' + response.response + ')')
          })
          contents.push(' ')
        }
      }
    })
  }
  contents.push(' ')
  contents.push('### Schema')
  contents.push(' ')
  if (requestDetails.docs != null && requestDetails.docs.schemas != null) {
    requestDetails.docs.schemas.forEach((schema) => {
      contents.push('#### ' + schema.title)
      contents.push(' ')
      contents.push('| Path | Description | Data Type | Expected Value(s) |')
      contents.push('|------|-------------|-----------|-------------------|')
      schema.schema.forEach((schemaDetails) => {
        contents.push('| ' + schemaDetails.path +
                      ' | ' + schemaDetails.description +
                      ' | ' + schemaDetails.dataType +
                      ' | ' + schemaDetails.expectedValues +
                      ' |'
        )
      })
      contents.push(' ')
    })
  }
  contents.push(' ')

  files.createFile(workingFolder, currentProject, 'docs', path.basename(request, '.json') + '.md', contents.join('\n'))
}

module.exports.generateDocs = generateDocs
