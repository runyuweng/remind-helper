
const vscode = require('vscode');
const simpleGit = require('simple-git')(vscode.workspace.rootPath);

const git = function() {}

git.prototype.init = function() {
  this.fetch();
  this.loopFetch();
}

git.prototype.loopFetch = function() {
  this.timer = setTimeout(() => {
    this.fetch();
    this.loopFetch();
  }, 60 * 60 * 1000)
}

git.prototype.fetch = function() {
  simpleGit.raw([
    'fetch',
    'origin',
    'master'
  ], (err) => {
    if (err) {
      console.error(err);
    }
    this.getLatestCommitFromMaster()
  });
}

git.prototype.getLatestCommitFromMaster = function() {
  simpleGit.raw([
    'log',
    'origin/master',
    '-1'
  ], (err, str) => {
    if (err) {
      console.error(err);
    }
    this.commitId = str.match(/commit (\S*)/)[1].trim();
    this.updateTime = str.match(/Date:   (.*)/)[1].trim();
    this.checkIsMergedMaster()
  });
}

git.prototype.checkIsMergedMaster = function() {
  if (!this.commitId) {
    return
  }
  simpleGit.raw([
    'log',
  ], (err, str) => {
    if (err) {
      console.error(err);
    }
    const hasMergedMaster = str.indexOf(this.commitId) > -1;
    if (!hasMergedMaster) {
      vscode.window.showWarningMessage('master分支更新了，请及时合并 😊');
    }
  });
}

module.exports = git;