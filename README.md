# remind-helper
## Features
- 此插件会监听`yarn.lock`、`package.json`、`package-lock.json`文件的改动，一旦发现会自动检查`package-lock.json`或`yarn.lock`中的包版本与`node_modules`中实际安装的包版本是否一致，避免在`merge`了其他分支（升级了某个包的版本）后，仍使用老包进行开发，上线前后才发现升级包引发的问题；
- 检查当前分支是否`merge`了远程的`master`分支，每隔半小时定时检查，在进行 `git add`、`git checkout branch`、 `git commit` 这些命令后也会触发检查，如果没有合并就会自动提醒，避免在测试完成后`merge`，导致额外的风险。

## Install
在vscode扩展商店中搜索安装。

## Usage
安装插件完成后，点击重新加载插件就会自动运行。
如果希望立即触发检查可以执行以下操作：
- 同时按住`command+shift+p`弹出输入框；
- 在输入框内输入`check`然后回车。
