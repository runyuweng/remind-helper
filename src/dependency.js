const vscode = require('vscode');
const semver = require('semver')
const fs = require('fs');
const chokidar = require('chokidar');
const lockfile = require('@yarnpkg/lockfile');
const { TYPE_MAPPING } = require('./utils/constants');

const ROOT_PATH = vscode.workspace.rootPath;

const jsonPath = ROOT_PATH + '/package.json';
const packageLockJsonPath = ROOT_PATH + '/package-lock.json';
const yarnLockPath = ROOT_PATH + '/yarn.lock';
const modulePath = ROOT_PATH + '/node_modules';

function transferPathToJson(path) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(err);
  }
  return data;
}

const dependency = function() {}

dependency.prototype.init = function() {
  this.checkAll(packageLockJsonPath, TYPE_MAPPING.PACKAGE_LOCK);
  this.checkAll(yarnLockPath, TYPE_MAPPING.YARN_LOCK);
  this.watchFileChange();
}

dependency.prototype.watch = function(lockPath, type) {
  chokidar.watch([
    jsonPath,
    lockPath,
  ], {
    ignoreInitial: true,
  }).on('all', () => {
    this.checkAll(lockPath, type);
  }).on('error', error => console.log(`Watcher error: ${error}`));
}

dependency.prototype.watchFileChange = function() {
  // 监听package-lock.json的变化
  this.watch(packageLockJsonPath, TYPE_MAPPING.PACKAGE_LOCK);

  // 监听yarn.lock的变化
  this.watch(yarnLockPath, TYPE_MAPPING.YARN_LOCK);
}

dependency.prototype.checkAll = function(lockPath, type) {
  console.log('this.checkAll');
  const allDependencies = this.getAllDependencies(lockPath, type);
  this.checkIdentical(allDependencies, type);
}

// 不管是yarn.lock还是package-lock.json都统一成package-lock.json处理
dependency.prototype.unifiedToPackageLock = function(lockPath, type) {
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

dependency.prototype.getAllDependencies = function(lockPath, type) {
  // 当前目录下有package.json, package-lock.json, node_modules才会进行检查
  const allDependenciesArr = [];

  const isExist = fs.existsSync(jsonPath) &&
    fs.existsSync(lockPath) &&
    fs.existsSync(modulePath);

  if (!isExist) {
    return allDependenciesArr;
  }

  let json = transferPathToJson(jsonPath);
  let lockJson = this.unifiedToPackageLock(lockPath, type);

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

dependency.prototype.checkIdentical = function(allDependencies, type) {
  const errorMessages = [];
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
      errorMessages.push({
        name,
        shouldInstallVersion: version,
        actualInsallVersion: itemModuleJson.version,
        message: `${name} 包在 ${type} 文件中的版本为 ${version} 与 node_modules 中实际安装的 ${itemModuleJson.version} 版本不一致`,
      })
    }
  })
  errorMessages.length && errorMessages.forEach(d => {
    vscode.window.showInformationMessage(d.message, '与lock同步', '忽略').then(select => {
      console.log(d, select)
    });
  })
}


module.exports = dependency;