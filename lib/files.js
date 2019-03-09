const fs = require('fs')

/**
 * findFile
 * @param {workingFolder} workingFolder
 * @param {string} fileName file name or full path
 * @param {string} kind the kind of file we are looking for
 * @param {string} project name
 * @return {string} path to resolved file
 */
function findFile(workingFolder, fileName, kind, project) {
  // If fileName is a full path and exists, well return it
  if (fs.existsSync(fileName) == true) {
    return fileName
  } else {
    const projectPath = project != null ? '/' + project : ''
    let path = workingFolder + projectPath + '/' + kind +'/' + fileName
    if (!path.endsWith('.json')) {
      path = path + '.json'
    }
    if (fs.existsSync(path) == true) {
      return path
    }
  }
  return null
}

/**
 * listFiles
 * @param {workingFolder} workingFolder
 * @param {string} kind the kind of file we are looking for
 * @param {string} project name
 * @param {string} subfolder optional subfolder to look in
 * @return {array} list of files found
 */
function listFiles(workingFolder, kind, project, subfolder) {
  const projectPath = project != null ? '/' + project : ''
  let path = workingFolder + projectPath + '/' + kind
  if (subfolder) {
    path = path + '/' + subfolder
  }

  let files = fs.readdirSync(path).filter((a) => a.endsWith('.json')).map((a) => subfolder ? subfolder + '/' + a: a)
  const folders = fs.readdirSync(path).filter(function(file) {
    return fs.statSync(path+'/'+file).isDirectory()
  })
  folders.forEach((folder) => {
    let childFolder = folder
    if (subfolder) {
      childFolder = subfolder + '/' + folder
    }
    const childFiles = listFiles(workingFolder, kind, project, childFolder)
    files = files.concat(childFiles)
  })
  return files
}

/**
 * listFiles
 * @param {string} workingFolder
 * @return {array} list of files found
 */
function listProjects(workingFolder) {
  return fs.readdirSync(workingFolder).filter((a) => a !== '.DS_Store')
}

/**
 * createFile
 * @param {string} workingFolder
 * @param {string} project
 * @param {string} kind
 * @param {string} path
 * @param {string} contents
 */
function createFile(workingFolder, project, kind, path, contents) {
  const kindPath = kind != null ? '/' + kind : ''
  const projectPath = project != null ? '/' + project : ''
  const filePath = workingFolder + projectPath + kindPath +'/' + path
  fs.writeFileSync(filePath, contents)
}

/**
 * projectFileContents
 * @param {string} workingFolder
 * @param {string} project
 * @return {object} project file contents
 */
function projectFileContents(workingFolder, project) {
  const projectPath = project != null ? '/' + project : ''
  const path = workingFolder + projectPath + '/project.json'
  if (fs.existsSync(path) == true) {
    const projectFile = fs.readFileSync(path)
    if (projectFile != null) {
      return JSON.parse(projectFile)
    }
  }
  return {}
}

module.exports.findFile = findFile
module.exports.listFiles = listFiles
module.exports.listProjects = listProjects
module.exports.createFile = createFile
module.exports.projectFileContents = projectFileContents
