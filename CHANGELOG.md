# Change Log
All notable changes to the "remind-helper" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]
- Initial release

## [0.0.5] - 2018-11-29
### Fixed
- Downgraded event-stream version with malicious code which is vscode based on.

## [0.0.6] - 2018-12-03
### Added
- Check if the local installed package is consistent with that in yarn.lock.
- After GIT operation will auto check whether the current branch has merged the latest master branch.

## [0.0.8] - 2018-12-03
### Changed
- Use lodash.debounce to handle check event.