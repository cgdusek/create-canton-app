#!/usr/bin/env node

const { program } = require('commander');
const create = require('../src/commands/create');
const compile = require('../src/commands/compile');
const test = require('../src/commands/test');

// Simple banner without chalk.bold
console.log('\x1b[36m%s\x1b[0m', `
   ____            _              
  / ___|__ _ _ __ | |_ ___  _ __  
 | |   / _\` | '_ \\| __/ _ \\| '_ \\ 
 | |__| (_| | | | | || (_) | | | |
  \\____\\__,_|_| |_|\\__\\___/|_| |_|
                                   
  Canton Network Developer CLI
  Build privacy-first dApps in minutes
`);

program
  .name('create-canton-app')
  .description('Scaffold Canton/Daml projects instantly')
  .version('0.1.0');

// Main create command
program
  .argument('[project-name]', 'Name of your project')
  .option('-t, --template <type>', 'Template to use (token, multiparty, asset)')
  .option('--no-tests', 'Skip test files')
  .action(create);

// Compile command
program
  .command('compile')
  .description('Compile your Daml contracts')
  .action(compile);

// Test command
program
  .command('test')
  .description('Run your contract tests')
  .action(test);

program.parse(process.argv);
