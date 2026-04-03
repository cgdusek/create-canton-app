const ora = require('ora');
const shell = require('shelljs');
const { getJavaCheck, isDpmInstalled } = require('./runtime');

const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`
};

function test() {
  console.log('');
  const spinner = ora('Running tests...').start();

  if (!isDpmInstalled()) {
    spinner.fail(colors.red('DPM not found!'));
    console.log('');
    console.log(colors.yellow('Install DPM:'));
    console.log(colors.white('  curl https://get.digitalasset.com/install/install.sh | sh'));
    console.log('');
    process.exit(1);
  }

  const javaCheck = getJavaCheck();
  if (!javaCheck.available) {
    spinner.fail(colors.red('Usable Java runtime not found!'));
    console.log('');
    console.log(colors.yellow('Install OpenJDK 17 and ensure it is on your PATH:'));
    console.log(colors.white('  brew install openjdk@17'));
    console.log(colors.dim('  macOS note: /usr/bin/java may exist without a configured JDK'));
    console.log('');
    process.exit(1);
  }

  const result = shell.exec('dpm test', { silent: true });

  if (result.code !== 0) {
    spinner.fail(colors.red('Tests failed!'));
    console.log('');
    console.log(colors.red(result.stderr));
    process.exit(1);
  }

  spinner.succeed(colors.green('All tests passed!'));
  console.log('');
  console.log(colors.dim(result.stdout));
}

module.exports = test;
