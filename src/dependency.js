const vscode = require('vscode');
const semver = require('semver')
const fs = require('fs');
const chokidar = require('chokidar');
const _ = require('lodash')

const jsonPath = vscode.workspace.rootPath + '/package.json';
const lockJsonPath = vscode.workspace.rootPath + '/package-lock.json';
const modulePath = vscode.workspace.rootPath + '/node_modules';

const dependency = function() {
  this.allDependencies = [];
  this.checkAll = _.debounce(this.checkAll, 600);
}

dependency.prototype.init = function() {
  this.checkAll();
  this.watchFileChange();
}

dependency.prototype.checkAll = function() {
  console.log('start to check')
  this.getAllDependencies();
  this.checkIdentical();
}

dependency.prototype.watchFileChange = function() {
  chokidar.watch(modulePath, {
    ignoreInitial: true,
    ignored: [
      new RegExp(modulePath+'/*.'),
    ]
  })
  .on('addDir', () => { this.checkAll(); })
  .on('unlinkDir', () => { this.checkAll(); })
  .on('error', error => console.log(`Watcher error: ${error}`))

  chokidar.watch([
    jsonPath,
    lockJsonPath,
  ], {
    ignoreInitial: true
  }).on('all', () => {
    this.checkAll();
  }).on('error', error => console.log(`Watcher error: ${error}`))
}

dependency.prototype.getAllDependencies = function() {
  // 当前目录下有package.json, package-lock.json, node_modules才会进行检查
  const isExist = fs.existsSync(jsonPath) && fs.existsSync(lockJsonPath) && fs.existsSync(modulePath);
  if (!isExist) {
    return;
  }

  let json = {};
  try {
    json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (err) {
    console.error(err)
  }
  
  let lockJson = {};
  try {
    lockJson = JSON.parse(fs.readFileSync(lockJsonPath, 'utf-8'));
  } catch (err) {
    console.error(err)
  }

  // 在package-lock.json中找到package.json对应的版本
  const { dependencies = {}, devDependencies = {} } = json;
  const { dependencies: lockDependencies = {} } = lockJson;
  const allDependenciesObj = Object.assign(devDependencies, dependencies);
  this.allDependencies = [];
  Object.keys(allDependenciesObj).forEach(d => {
    this.allDependencies.push({
      name: d,
      version: lockDependencies[d] && lockDependencies[d].version
    });
  })
}

dependency.prototype.checkIdentical = function() {
  this.allDependencies.every(d => {
    const { name, version } = d;
    const modulePath = `${vscode.workspace.rootPath}/node_modules/${name}/package.json`;
    const moduleIsExist = fs.existsSync(modulePath);
    if (!moduleIsExist) {
      return false;
    }
    let json = {};
    try {
      json = JSON.parse(fs.readFileSync(modulePath, 'utf-8'));
    } catch (err) {
      console.error(err)
    }
    let isEqual = false
    try {
      isEqual = semver.eq(json.version, version);
    } catch (err) {
      console.error(err)
    }
    if (isEqual) {
      return true;
    }
    vscode.window.showWarningMessage(`${name} 包在 package-lock.json 文件中的版本与 node_modules 中实际安装的不一致`);
    return false;
  })
}


module.exports = dependency;