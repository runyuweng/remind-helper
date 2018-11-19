const vscode = require('vscode');
const dependency = require('./dependency')
const git = require('./git')

const Dependency = new dependency();
const Git = new git();

function check() {
    Dependency.init();
    Git.init();
}

function activate(context) {
    vscode.window.showInformationMessage('remind-helper 已启用');
    check();
    // 注册事件，可手动触发检查
    let disposable = vscode.commands.registerCommand('extension.check', function () {
        check();
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {
    Git.destory();
}
exports.deactivate = deactivate;