const shell = require('shelljs');

function isDpmInstalled() {
  return shell.which('dpm') !== null;
}

function getDpmVersion() {
  try {
    const result = shell.exec('dpm version --active', { silent: true });
    if (result.code !== 0) return null;

    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    const match = output.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getJavaCheck() {
  if (!shell.which('java')) {
    return {
      available: false,
      reason: 'java not found on PATH'
    };
  }

  const result = shell.exec('java -version', { silent: true });
  return {
    available: result.code === 0,
    reason: [result.stderr, result.stdout].filter(Boolean).join('\n').trim()
  };
}

module.exports = {
  getDpmVersion,
  getJavaCheck,
  isDpmInstalled
};
