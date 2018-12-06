const vscode = require('vscode');
const semver = require('semver');
const fs = require('fs');
const chokidar = require('chokidar');
const _ = require('lodash');
const lockfile = require('@yarnpkg/lockfile');
const {
  TYPE_MAPPING
} = require('./utils/constants');

const ROOT_PATH = vscode.workspace.rootPath;

const jsonPath = ROOT_PATH + '/package.json';
const packageLockJsonPath = ROOT_PATH + '/package-lock.json';
const yarnLockPath = ROOT_PATH + '/yarn.lock';
const modulePath = ROOT_PATH + '/node_modules';

const debounceCheck = _.debounce(checkAll, 100);

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
    debounceCheck(lockPath, type);
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
 * @param json {json} package.json file in JSON format
 * @return {Object} lock file in JSON format
 */
function unifiedToPackageLock(lockPath, type, json) {
  let data = {};

  if (type === TYPE_MAPPING.PACKAGE_LOCK) {
    data = transferPathToJson(lockPath);
  }

  if (type === TYPE_MAPPING.YARN_LOCK) {
    const { object } = lockfile.parse(fs.readFileSync(lockPath, 'utf8'));
    const dependencies = {};
    Object.keys(object).forEach(d => {
      const key = d.replace(/(.*)(@.*)$/, '$1');
      const versionRangeInName = d.match(/(.*@)(.*)$/)[2];
      let versionInName;
      // 记录下prop-types@^15.5.0这个title中的版本 可能title中的版本低但是version中定义的高
      // '>=4.0.3 <5.0.0' || '>=0.5.0 >=0.0.0 <1.0.0'
      if (semver.validRange(versionRangeInName).match(/^>=(.+?) .*/)) {
        versionInName = semver.validRange(versionRangeInName).match(/^>=(.+?) .*/)[1];
      // '>=4.0.3'
      } else if (semver.validRange(versionRangeInName).match(/^>=(.*)/)) {
        versionInName = semver.validRange(versionRangeInName).match(/^>=(.*)/)[1];
      // '1.1.1'
      } else {
        versionInName = versionRangeInName;
      }
      // yarn.lock中可能一个包出现多次，这种情况选用满足package.json中定义的版本且较低的一个版本
      if (json[key] && semver.satisfies(object[d].version, semver.validRange(json[key]))) {
        if (dependencies[key]) {
          if (semver.lt(versionInName, dependencies[key].versionInName)) {
            dependencies[key] = Object.assign(object[d], { versionInName });
          }
        } else {
          dependencies[key] = Object.assign(object[d], { versionInName })
        }
      }
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
  // 在package-lock.json中找到package.json对应的版本
  const { dependencies = {}, devDependencies = {} } = json;
  const allDependenciesObj = Object.assign(devDependencies, dependencies);
  let lockJson = unifiedToPackageLock(lockPath, type, allDependenciesObj);
  const { dependencies: lockDependencies = {} } = lockJson;
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

    if (!itemModuleJson.version) {
      messages.push({
        message: `${name} 包在 ${type} 文件中的版本为 ${version} 但本地未安装`,
      })
      return;
    }

    try {
      isEqual = semver.eq(itemModuleJson.version, version);
    } catch (err) {
      console.error(err)
    }
  
    if (!isEqual) {
      messages.push({
        message: `${name} 包在 ${type} 文件中的版本为 ${version} 与 node_modules 中实际安装的 ${itemModuleJson.version} 版本不一致`,
      })
    }
  })
  messages.length && messages.forEach((d) => {
    vscode.window.showWarningMessage(d.message);
  })
}

const dependency = function() {}

dependency.prototype.init = function() {
  checkAll(packageLockJsonPath, TYPE_MAPPING.PACKAGE_LOCK);
  checkAll(yarnLockPath, TYPE_MAPPING.YARN_LOCK);
  startToWatch();
}

module.exports = dependency;