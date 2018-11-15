const vscode = require('vscode');
const semver = require('semver')
const fs = require('fs');
const chokidar = require('chokidar');

const jsonPath = vscode.workspace.rootPath + '/package.json';
const lockJsonPath = vscode.workspace.rootPath + '/package-lock.json';
const modulePath = vscode.workspace.rootPath + '/node_modules';

const dependency = function() {}

dependency.prototype.init = function () {
  this.checkAll();
  this.watchFileChange();
}

dependency.prototype.checkAll = function () {
  this.getAllDependencies();
  this.checkIdentical();
}

dependency.prototype.watchFileChange = function() {
  chokidar.watch([
    jsonPath,
    lockJsonPath,
    modulePath
  ]).on('all', () => {
    console.log('file Change')
    this.checkAll();
  });
}

dependency.prototype.getAllDependencies = function () {
  // 当前目录下有package.json, package-lock.json, node_modules才会进行检查
  const isExist = fs.existsSync(jsonPath) && fs.existsSync(lockJsonPath) && fs.existsSync(modulePath);
  if (!isExist) {
    return;
  }

  let json = {};
  try {
    json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  } catch (err) {
    throw new Error(err);
  }
  
  let lockJson = {};
  try {
    lockJson = JSON.parse(fs.readFileSync(lockJsonPath, 'utf-8'));
  } catch (err) {
    throw new Error(err);
  }

  // 在package-lock.json中找到package.json对应的版本
  const { dependencies, devDependencies } = json;
  const { dependencies: lockDependencies} = lockJson;
  const allDependenciesObj = Object.assign(devDependencies, dependencies);
  this.allDependencies = [];
  Object.keys(allDependenciesObj).forEach(d => {
    this.allDependencies.push({
      name: d,
      version: lockDependencies[d].version
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
      throw new Error(err);
    }
    const isEqual = semver.eq(json.version, version);
    if (isEqual) {
      return true;
    }
    vscode.window.showErrorMessage(`${name} 包在 package-lock.json 文件中的版本与 node_modules 中实际安装的不一致`);
    return false;
  })
}


module.exports = dependency;