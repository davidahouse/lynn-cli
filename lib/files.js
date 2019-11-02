const fs = require('fs');

/**
 * findFile
 * @param {workingFolder} workingFolder
 * @param {string} fileName file name or full path
 * @param {string} kind the kind of file we are looking for
 * @return {string} path to resolved file
 */
function findFile(workingFolder, fileName, kind) {
  // If fileName is a full path and exists, well return it
  if (fs.existsSync(fileName) == true) {
    return fileName;
  } else {
    let path = workingFolder + '/' + kind + '/' + fileName;
    if (!path.endsWith('.json')) {
      path = path + '.json';
    }
    if (fs.existsSync(path) == true) {
      return path;
    }
  }
  return null;
}

/**
 * rootPath
 * @param {string} workingFolder
 * @param {string} kind
 */
function rootPath(workingFolder, kind) {
  const path = workingFolder + '/' + kind;
  return path;
}

/**
 * listFiles
 * @param {workingFolder} workingFolder
 * @param {string} kind the kind of file we are looking for
 * @param {string} subfolder optional subfolder to look in
 * @return {array} list of files found
 */
function listFiles(workingFolder, kind, subfolder) {
  let path = workingFolder + '/' + kind;
  if (subfolder) {
    path = path + '/' + subfolder;
  }

  if (!fs.existsSync(path)) {
    return [];
  }

  let files = fs
    .readdirSync(path)
    .filter(
      a => a.endsWith('.json') || a.endsWith('.yml') || a.endsWith('.yaml')
    )
    .map(a => (subfolder ? subfolder + '/' + a : a));
  const folders = fs.readdirSync(path).filter(function(file) {
    return fs.statSync(path + '/' + file).isDirectory();
  });
  folders.forEach(folder => {
    let childFolder = folder;
    if (subfolder) {
      childFolder = subfolder + '/' + folder;
    }
    const childFiles = listFiles(workingFolder, kind, childFolder);
    files = files.concat(childFiles);
  });
  return files;
}

/**
 * createFile
 * @param {string} workingFolder
 * @param {string} kind
 * @param {string} path
 * @param {string} contents
 */
function createFile(workingFolder, kind, path, contents) {
  const kindPath = kind != null ? '/' + kind : '';
  const filePath = workingFolder + '/' + kindPath + '/' + path;
  fs.writeFileSync(filePath, contents);
}

/**
 * projectFileContents
 * @param {string} workingFolder
 * @return {object} project file contents
 */
function projectFileContents(workingFolder) {
  const path = workingFolder + '/project.json';
  if (fs.existsSync(path) == true) {
    const projectFile = fs.readFileSync(path);
    if (projectFile != null) {
      return JSON.parse(projectFile);
    }
  }
  return {};
}

module.exports.rootPath = rootPath;
module.exports.findFile = findFile;
module.exports.listFiles = listFiles;
module.exports.createFile = createFile;
module.exports.projectFileContents = projectFileContents;
