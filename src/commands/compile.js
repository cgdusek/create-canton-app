const ora = require('ora');
const shell = require('shelljs');
const { isDpmInstalled } = require('./runtime');

const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`
};

function compile() {
  console.log('');
  const spinner = ora('Compiling Daml contracts...').start();

  if (!isDpmInstalled()) {
    spinner.fail(colors.red('DPM not found!'));
    console.log('');
    console.log(colors.yellow('Install DPM:'));
    console.log(colors.white('  curl https://get.digitalasset.com/install/install.sh | sh'));
    console.log('');
    process.exit(1);
  }

  const result = shell.exec('dpm build', { silent: true });

  if (result.code !== 0) {
    spinner.fail(colors.red('Compilation failed!'));
    console.log('');
    console.log(colors.red(result.stderr));
    process.exit(1);
  }

  spinner.succeed(colors.green('Contracts compiled successfully!'));
  console.log('');
}

module.exports = compile;
