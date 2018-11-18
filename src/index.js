const vscode = require('vscode');
const dependency = require('./dependency')
const git = require('./git')

const Dependency = new dependency();
const Git = new git();

function activate(context) {

    let disposable = vscode.commands.registerCommand('extension.start', function () {
        vscode.window.showInformationMessage('remind-helper 已启用 👌');

        Dependency.init();
        Git.init();
    });

    context.subscriptions.push(disposable);
}
exports.activate = activate;

function deactivate() {
    Git.destory();
}
exports.deactivate = deactivate;