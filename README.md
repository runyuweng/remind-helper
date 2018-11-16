# remind-helper

## Install
在扩展商店中搜索安装即可。
## Usage
同时按住`command+shift+p`弹出输入框，在输入框内输入`remind-helper`然后按回车即可。
## Features
- 检查`package-lock.json`中的包版本与`node_modules`中实际安装的包版本是否一致，避免在`merge`了其他分支（升级了某个包的版本）后，仍使用老包进行开发，上线后才发现升级包引发的问题；
- 检查当前分支是否`merge`了`master`分支，每隔一小时定时提醒，避免在测试完成后`merge`，导致时间上的消耗和额外的风险。
