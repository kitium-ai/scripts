#!/usr/bin/env node
/**
 * Ensure .changeset directory and config.json exist before running changeset
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { program } from 'commander';
import chalk from 'chalk';

const logger = {
  info: (message) => console.log(chalk.blue('ℹ'), message),
  success: (message) => console.log(chalk.green('✔'), message),
  warn: (message) => console.log(chalk.yellow('⚠'), message),
  error: (message) => console.error(chalk.red('✖'), message),
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const currentDir = process.cwd();
const changesetDir = path.join(currentDir, '.changeset');
const configPath = path.join(changesetDir, 'config.json');

const defaultConfig = {
  $schema: 'https://unpkg.com/@changesets/config@2.3.1/schema.json',
  changelog: '@changesets/cli/changelog',
  commit: false,
  fixed: [],
  linked: [],
  access: 'public',
  baseBranch: 'main',
  updateInternalDependencies: 'patch',
  ignore: []
};

program
  .name('ensure-changeset')
  .description('Ensure .changeset directory and config.json exist')
  .option('-f, --force', 'Overwrite existing config', false)
  .action(async (options) => {
    try {
      // Create .changeset directory if it doesn't exist
      try {
        await fs.access(changesetDir);
      } catch {
        await fs.mkdir(changesetDir, { recursive: true });
        logger.success('Created .changeset directory');
      }

      // Create config.json if it doesn't exist or force is true
      let configExists = false;
      try {
        await fs.access(configPath);
        configExists = true;
      } catch {
        // Config doesn't exist
      }

      if (!configExists || options.force) {
        await fs.writeFile(
          configPath,
          JSON.stringify(defaultConfig, null, 2) + '\n',
          'utf-8'
        );
        logger.success(configExists ? 'Overwrote .changeset/config.json' : 'Created .changeset/config.json');
      } else {
        logger.info('.changeset/config.json already exists');
      }
    } catch (error) {
      logger.error(`Error setting up .changeset: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();

