const vscode = require('vscode');
const semver = require('semver')
const fs = require('fs');
const chokidar = require('chokidar');
const lockfile = require('@yarnpkg/lockfile');
const { exec } = require('child_process');
const {
  TYPE_MAPPING, NPM_UPDATE_SCRIPT, YARN_UPDATE_SCRIPT
} = require('./utils/constants');

const ROOT_PATH = vscode.workspace.rootPath;

const jsonPath = ROOT_PATH + '/package.json';
const packageLockJsonPath = ROOT_PATH + '/package-lock.json';
const yarnLockPath = ROOT_PATH + '/yarn.lock';
const modulePath = ROOT_PATH + '/node_modules';

/**
 * @method transferPathToJson
 * @param path {string} path
 * @return {Object} json
 */
function transferPathToJson(path) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(err);
  }
  return data;
}

/**
 * @method watch
 * @param lockPath {string} lock file path
 * @param type {string} package-lock.json or yarn.lock
 */
function watch(lockPath, type) {
  chokidar.watch([
    jsonPath,
    lockPath,
  ], {
    ignoreInitial: true,
  }).on('all', () => {
    checkAll(lockPath, type);
  }).on('error', error => console.log(`Watcher error: ${error}`));
}

/**
 * @method startToWatch
 */
function startToWatch() {
  // 监听package-lock.json的变化
  watch(packageLockJsonPath, TYPE_MAPPING.PACKAGE_LOCK);
  // 监听yarn.lock的变化
  watch(yarnLockPath, TYPE_MAPPING.YARN_LOCK);
}


/**
 * @method checkAll
 * @param lockPath {string} lock file path
 * @param type {string} package-lock.json or yarn.lock
 */
function checkAll(lockPath, type) {
  const allDependencies = getAllDependencies(lockPath, type);
  checkIdentical(allDependencies, type);
}

/**
 * @method unifiedToPackageLock
 * @param lockPath {string} lock file path
 * @param type {string} package-lock.json or yarn.lock
 * @return {Object} lock file in JSON format
 */
function unifiedToPackageLock(lockPath, type) {
  let data = {};

  if (type === TYPE_MAPPING.PACKAGE_LOCK) {
    data = transferPathToJson(lockPath);
  }

  if (type === TYPE_MAPPING.YARN_LOCK) {
    const { object } = lockfile.parse(fs.readFileSync(lockPath, 'utf8'));
    const dependencies = {};
    Object.keys(object).forEach(d => {
      dependencies[d.replace(/(.*)(@.*)$/, '$1' )] = object[d];
    });
    data.dependencies = dependencies;
  }

  return data;
}

/**
 * @method getAllDependencies
 * @param lockPath {string} lock file path
 * @param type {string} package-lock.json or yarn.lock
 * @return {Array} dependencies array
 */
function getAllDependencies(lockPath, type) {
  // 当前目录下有package.json, package-lock.json, node_modules才会进行检查
  const allDependenciesArr = [];

  const isExist = fs.existsSync(jsonPath) &&
    fs.existsSync(lockPath) &&
    fs.existsSync(modulePath);
  if (!isExist) {
    return allDependenciesArr;
  }
  let json = transferPathToJson(jsonPath);
  let lockJson = unifiedToPackageLock(lockPath, type);
  // 在package-lock.json中找到package.json对应的版本
  const { dependencies = {}, devDependencies = {} } = json;
  const { dependencies: lockDependencies = {} } = lockJson;
  const allDependenciesObj = Object.assign(devDependencies, dependencies);
  Object.keys(allDependenciesObj).forEach(d => {
    allDependenciesArr.push({
      name: d,
      version: lockDependencies[d] && lockDependencies[d].version,
    });
  })
  return allDependenciesArr;
}

/**
 * @method checkIdentical
 * @param lockPath {string} lock file path
 * @param type {string} package-lock.json or yarn.lock
 */
function checkIdentical(allDependencies, type) {
  const messages = [];
  allDependencies.forEach(item => {
    const { name, version } = item;
    const itemModulePath = `${ROOT_PATH}/node_modules/${name}/package.json`;
    let itemModuleJson = transferPathToJson(itemModulePath);
    let isEqual = false;

    try {
      isEqual = semver.eq(itemModuleJson.version, version);
    } catch (err) {
      console.error(err)
    }
  
    if (!isEqual) {
      messages.push({
        name,
        shouldInstallVersion: version,
        actualInsallVersion: itemModuleJson.version,
        message: `${name} 包在 ${type} 文件中的版本为 ${version} 与 node_modules 中实际安装的 ${itemModuleJson.version} 版本不一致`,
      })
    }
  })
  messages.length && messages.forEach((d, index) => {
    if (index === messages.length - 1) {
      const UPDATE_TEXT = `将所有包更新至${type}文件中定义的版本`;
      vscode.window.showWarningMessage(d.message, UPDATE_TEXT, '忽略').then(select => {
        if (select === UPDATE_TEXT) {
          updateVersion(type)
        }
      });
      return
    }
    vscode.window.showWarningMessage(d.message);
  })
}

/**
 * @method updateVersion
 * @param type {string} package-lock.json or yarn.lock
 */
function updateVersion(type) {
  let script = '';
  if (type === TYPE_MAPPING.PACKAGE_LOCK) {
    script = NPM_UPDATE_SCRIPT;
  }
  if (type === TYPE_MAPPING.YARN_LOCK) {
    script = YARN_UPDATE_SCRIPT;
  }
  exec(script, { cwd: ROOT_PATH }, (err, stdout) => {
    if (err) {
      vscode.window.showErrorMessage('同步失败请手动尝试')
      console.error(err);
      return;
    }
    console.log(stdout);
    vscode.window.showInformationMessage(`所有包已更新至${type}文件中定义的版本`);
    checkAll(packageLockJsonPath, type);
  });
}

const dependency = function() {}

dependency.prototype.init = function() {
  checkAll(packageLockJsonPath, TYPE_MAPPING.PACKAGE_LOCK);
  checkAll(yarnLockPath, TYPE_MAPPING.YARN_LOCK);
  startToWatch();
}

module.exports = dependency;