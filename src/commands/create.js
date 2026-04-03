const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const shell = require('shelljs');

const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

const BEGINNER_TEMPLATES = [
  {
    name: 'Token Transfer System',
    value: 'TokenTransfer',
    aliases: ['token', 'token-transfer']
  },
  {
    name: 'Multi-Party Agreement',
    value: 'Multiparty',
    aliases: ['multi-party']
  },
  {
    name: 'Asset Holding System',
    value: 'AssetOwner',
    aliases: ['asset', 'asset-owner']
  }
];

function isDpmInstalled() {
  return shell.which('dpm') !== null;
}

function getDpmVersion() {
  try {
    const result = shell.exec('dpm version --active', { silent: true });
    const match = result.stdout.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function getDpmTemplates() {
  try {
    const result = shell.exec('dpm new --list', { silent: true });
    if (result.code !== 0) return [];
    
    const lines = result.stdout.split('\n');
    const templates = [];
    let inTemplateList = false;
    
    for (const line of lines) {
      if (line.includes('following templates are available')) {
        inTemplateList = true;
        continue;
      }
      if (inTemplateList && line.trim()) {
        const templateName = line.trim();
        if (templateName && !templateName.startsWith('The')) {
          templates.push(templateName);
        }
      }
    }
    
    return templates;
  } catch {
    return [];
  }
}

function resolveBeginnerTemplate(template) {
  if (!template) return null;

  const normalized = template.trim().toLowerCase();
  const match = BEGINNER_TEMPLATES.find(({ value, aliases }) =>
    value.toLowerCase() === normalized || aliases.includes(normalized)
  );

  return match ? match.value : null;
}

async function installDpm() {
  console.log('');
  console.log(colors.yellow('⚠️ DPM (Digital Asset Package Manager) not found!'));
  console.log('');
  console.log(colors.white('DPM is the official Canton development tool.'));
  console.log(colors.dim('(Replaces the deprecated Daml Assistant)'));
  console.log('');
  
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'installDpm',
      message: 'Would you like to install DPM now? (Recommended)',
      default: true
    }
  ]);

  if (!answers.installDpm) {
    console.log('');
    console.log(colors.yellow('⚠️ Skipping DPM installation.'));
    console.log(colors.dim('Install manually:'));
    console.log(colors.white('  curl https://get.digitalasset.com/install/install.sh | sh'));
    console.log('');
    return false;
  }

  console.log('');
  const spinner = ora('Installing DPM (this may take a few minutes)...').start();

  try {
    // FIXED: Use correct installation URL
    const result = shell.exec('curl -sSL https://get.digitalasset.com/install/install.sh | sh', { 
      silent: false  // Show output so user can see progress
    });

    if (result.code !== 0) {
      spinner.fail(colors.red('Failed to install DPM'));
      console.log('');
      console.log(colors.yellow('Install manually:'));
      console.log(colors.white('  curl https://get.digitalasset.com/install/install.sh | sh'));
      console.log('');
      return false;
    }

    // Add to PATH for current session
    const dpmPath = path.join(process.env.HOME, '.dpm', 'bin');
    process.env.PATH = `${dpmPath}:${process.env.PATH}`;

    spinner.succeed(colors.green('✨ DPM installed successfully!'));
    
    console.log('');
    console.log(colors.cyan('Important: Add DPM to your PATH permanently'));
    console.log(colors.dim('Add this line to your ~/.zshrc or ~/.bashrc:'));
    console.log('');
    console.log(colors.white(`  export PATH="$HOME/.dpm/bin:$PATH"`));
    console.log('');
    console.log(colors.yellow('Then reload your shell:'));
    console.log(colors.white('  source ~/.zshrc'));
    console.log('');

    return true;
  } catch (error) {
    spinner.fail(colors.red('Installation failed: ' + error.message));
    console.log('');
    console.log(colors.yellow('Try installing manually:'));
    console.log(colors.white('  curl https://get.digitalasset.com/install/install.sh | sh'));
    console.log('');
    return false;
  }
}

async function createFromDpmTemplate(projectName, dpmTemplate) {
  console.log('');
  const spinner = ora(`Creating project from DPM template: ${dpmTemplate}...`).start();
  
  try {
    // CORRECT DPM syntax: dpm new --template <template-name> <project-name>
    const result = shell.exec(`dpm new --template ${dpmTemplate} ${projectName}`, { 
      silent: false
    });

    if (result.code !== 0) {
      spinner.fail(colors.red('Failed to create project'));
      return false;
    }

    spinner.succeed(colors.green('Project created successfully!'));
    return true;
  } catch (error) {
    spinner.fail(colors.red('Error: ' + error.message));
    return false;
  }
}

async function create(projectName, options) {
  try {
    console.log('');
    console.log(colors.cyan('🔍 Checking prerequisites...'));
    console.log('');

    let dpmJustInstalled = false;

    if (!isDpmInstalled()) {
      const installed = await installDpm();
      if (installed) {
        dpmJustInstalled = true;
        // Give the system a moment to update PATH
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log(colors.yellow('⚠️  Continuing without DPM...'));
        console.log(colors.dim('You can install it later and use DPM templates.'));
        console.log('');
      }
    } else {
      const version = getDpmVersion();
      console.log(colors.green(`✅ DPM found${version ? ` (v${version})` : ''}`));
    }

    if (!shell.which('java')) {
      console.log(colors.yellow('⚠️  Java not found (optional, needed for tests)'));
      console.log(colors.dim('   Install: brew install openjdk@17'));
    } else {
      console.log(colors.green('✅ Java Runtime found'));
    }

    console.log('');

    if (!projectName) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'What is your project name?',
          default: 'my-canton-app'
        }
      ]);
      projectName = answers.projectName;
    }

    let templateType;
    const wasTemplateProvided = process.argv.includes('--template') || process.argv.includes('-t');
    
    // Check if DPM is available NOW (after potential installation)
    const dpmAvailable = isDpmInstalled();
    
    if (!wasTemplateProvided) {
      const choices = [
        { name: 'Beginner Templates (curated)', value: 'beginner' }
      ];

      // Only show DPM option if DPM is actually installed
      if (dpmAvailable) {
        choices.push({ name: 'Official DPM Templates (advanced)', value: 'dpm' });
      }

      const typeAnswers = await inquirer.prompt([
        {
          type: 'list',
          name: 'templateType',
          message: 'What type of template would you like?',
          choices
        }
      ]);
      templateType = typeAnswers.templateType;
    } else {
      templateType = 'beginner';
    }

    if (templateType === 'dpm') {
      if (!dpmAvailable) {
        console.log(colors.red('❌ DPM required for official templates.'));
        console.log(colors.yellow('Please install DPM first:'));
        console.log(colors.white('  curl https://get.digitalasset.com/install/install.sh | sh'));
        process.exit(1);
      }

      console.log('');
      console.log(colors.cyan('Fetching DPM templates...'));
      
      const dpmTemplates = getDpmTemplates();
      
      if (dpmTemplates.length === 0) {
        console.log(colors.yellow('⚠️  Could not fetch DPM templates.'));
        console.log(colors.dim('Try running: dpm new --list'));
        console.log('');
        console.log(colors.yellow('Falling back to beginner templates...'));
        templateType = 'beginner';
      } else {
        console.log(colors.green(`✅ Found ${dpmTemplates.length} DPM templates`));
        console.log('');

        const templateAnswers = await inquirer.prompt([
          {
            type: 'list',
            name: 'dpmTemplate',
            message: 'Select a DPM template:',
            choices: dpmTemplates.map(t => ({ name: `  ${t}`, value: t })),
            pageSize: 15
          }
        ]);

        const success = await createFromDpmTemplate(projectName, templateAnswers.dpmTemplate);
        
        if (success) {
          console.log('');
          console.log(colors.cyan(colors.bold('📚 Next steps:')));
          console.log('');
          console.log(colors.white(`  cd ${projectName}`));
          console.log(colors.white(`  dpm build`));
          console.log(colors.white(`  dpm test`));
          console.log('');
        }
        
        return;
      }
    }

    // Handle beginner templates
    let template = options.template;
    
    if (!wasTemplateProvided) {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'template',
          message: 'Which template would you like?',
          choices: BEGINNER_TEMPLATES.map(({ name, value }) => ({ name, value }))
        }
      ]);
      template = answers.template;
    } else {
      template = resolveBeginnerTemplate(template);
      if (!template) {
        console.log(colors.red(`❌ Unknown template: ${options.template}`));
        console.log(colors.yellow('Valid templates: token, multiparty, asset'));
        process.exit(1);
      }
    }

    console.log('');
    const spinner = ora('Creating your Canton project...').start();

    const projectPath = path.isAbsolute(projectName)
      ? projectName
      : path.join(process.cwd(), projectName);
    const projectDirName = path.basename(projectPath);
    
    if (fs.existsSync(projectPath)) {
      spinner.fail(colors.red(`Folder ${projectPath} already exists!`));
      process.exit(1);
    }

    fs.mkdirSync(projectPath);

    const templatePath = path.join(__dirname, '../templates', template);
    if (fs.existsSync(templatePath)) {
      fs.copySync(templatePath, projectPath);
    } else {
      spinner.fail(colors.red(`Template ${template} not found.`));
      process.exit(1);
    }

    fs.mkdirSync(path.join(projectPath, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'config'), { recursive: true });

    createScripts(projectPath);
    createConfig(projectPath, projectDirName);
    createReadme(projectPath, projectDirName, template);
    createGitignore(projectPath);

    spinner.succeed(colors.green('✨ Project created successfully!'));

    console.log('');
    console.log(colors.cyan(colors.bold('Next steps:')));
    console.log('');
    console.log(colors.white(`  cd ${projectPath}`));
    
    if (dpmAvailable) {
      console.log(colors.white(`  dpm build           ${colors.dim('# Compile')}`));
      console.log(colors.white(`  dpm test            ${colors.dim('# Run tests')}`));
    } else {
      console.log(colors.yellow(`  # First, install DPM:`));
      console.log(colors.white(`  curl https://get.digitalasset.com/install/install.sh | sh`));
      console.log(colors.white(`  source ~/.zshrc`));
      console.log(colors.white(`  dpm build`));
    }
    
    console.log('');
    console.log(colors.dim('📖 Read README.md for more'));
    console.log('');

    if (dpmJustInstalled) {
      console.log(colors.cyan('💡 Tip: Restart your terminal or run:'));
      console.log(colors.white(`  source ~/.zshrc`));
      console.log(colors.dim('to use dpm commands immediately'));
      console.log('');
    }

  } catch (error) {
    console.error(colors.red('❌ Error:'), error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

function createScripts(projectPath) {
  const compileScript = `#!/bin/bash
echo "🔨 Compiling Daml contracts..."
dpm build
`;
  fs.writeFileSync(path.join(projectPath, 'scripts/compile.sh'), compileScript);

  const testScript = `#!/bin/bash
echo "🧪 Running tests..."
dpm test
`;
  fs.writeFileSync(path.join(projectPath, 'scripts/test.sh'), testScript);

  try {
    shell.chmod('+x', path.join(projectPath, 'scripts/*.sh'));
  } catch (e) {}
}

function createConfig(projectPath, projectName) {
  const damlConfig = `sdk-version: 3.4.9
name: ${projectName}
source: daml
version: 1.0.0
dependencies:
  - daml-prim
  - daml-stdlib
  - daml-script
`;
  fs.writeFileSync(path.join(projectPath, 'daml.yaml'), damlConfig);
}

function createGitignore(projectPath) {
  const gitignore = `.daml/
.dpm/
*.dar
*.log
node_modules/
.DS_Store
`;
  fs.writeFileSync(path.join(projectPath, '.gitignore'), gitignore);
}

function createReadme(projectPath, projectName, template) {
  const readme = `# ${projectName}

> Built with create-canton-app

## Template: ${template}

## Quick Start

\`\`\`bash
dpm build  # Compile
dpm test   # Run tests
\`\`\`

## Prerequisites

\`\`\`bash
curl https://get.digitalasset.com/install/install.sh | sh
\`\`\`

## Learn More

- [Canton Docs](https://docs.digitalasset.com)
- [DPM Docs](https://docs.digitalasset.com/build/3.4/dpm/dpm.html)
- [Canton Network](https://canton.network)
`;
  
  fs.writeFileSync(path.join(projectPath, 'README.md'), readme);
}

module.exports = create;
