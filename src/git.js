
const vscode = require('vscode');
const chokidar = require('chokidar');
const _ = require('lodash')
const simpleGit = require('simple-git')(vscode.workspace.rootPath);
const ROOT_PATH = vscode.workspace.rootPath;

const GIT_PATH = ROOT_PATH + '/.git';
const GIT_BRANCH_PATH = ROOT_PATH + '/.git/HEAD';
const GIT_ADD_PATH = ROOT_PATH + '/.git/index';
const GIT_COMMIT_PATH = ROOT_PATH + '/.git/COMMIT_EDITMSG';

const git = function() {
  this.check = _.debounce(this.check, 100);
}

git.prototype.check = function() {
  this.fetch();
  this.loopFetch();
}
/**
 * @method watch
 */
git.prototype.watchGitEvent = function() {
  chokidar.watch([
    GIT_BRANCH_PATH,
    GIT_ADD_PATH,
    GIT_COMMIT_PATH,
  ], {
    ignoreInitial: true,
  }).on('all', () => {
    this.check();
  }).on('error', error => console.log(`Watcher error: ${error}`));
}

git.prototype.init = function() {
  this.check();
  this.watchGitEvent();
}

git.prototype.destory = function() {
  this.timer && clearTimeout(this.timer);
}

git.prototype.loopFetch = function() {
  this.timer && clearTimeout(this.timer);
  this.timer = setTimeout(() => {
    this.check();
  }, 30 * 60 * 1000)
}

git.prototype.fetch = function() {
  simpleGit.raw([
    'fetch',
    'origin',
    'master'
  ], (err) => {
    if (err) {
      console.error(err);
      return
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
      return
    }
    this.commitId = str.match(/commit (\S*)/)[1].trim();
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
      return
    }
    const hasMergedMaster = str.indexOf(this.commitId) > -1;
    if (!hasMergedMaster) {
      vscode.window.showWarningMessage('master分支更新了，请及时合并');
    }
  });
}

module.exports = git;