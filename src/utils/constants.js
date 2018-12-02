const TYPE_MAPPING = {
  PACKAGE_LOCK: 'package-lock.json',
  YARN_LOCK: 'yarn.lock'
}

const NPM_UPDATE_SCRIPT = 'npm install';

const YARN_UPDATE_SCRIPT = 'yarn';

module.exports = {
  TYPE_MAPPING,
  NPM_UPDATE_SCRIPT,
  YARN_UPDATE_SCRIPT,
}