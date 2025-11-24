#!/usr/bin/env node
/**
 * CLI entry point for setNpmToken function
 * Usage: node bin/set-npm-token.js [token]
 */

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { program } from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const logger = {
  info: (message) => console.log(chalk.blue('ℹ'), message),
  success: (message) => console.log(chalk.green('✔'), message),
  warn: (message) => console.log(chalk.yellow('⚠'), message),
  error: (message) => console.error(chalk.red('✖'), message),
};

program
  .name('set-npm-token')
  .description('Set NPM authentication token in user-level .npmrc')
  .argument('[token]', 'NPM token (defaults to NPM_TOKEN env var)')
  .option('-r, --registry <url>', 'Registry URL', 'https://registry.npmjs.org/')
  .option('-l, --local', 'Set token locally in current working directory', false)
  .action(async (tokenArg, options) => {
    try {
      // Check if already authenticated
      try {
        const { stdout } = await execAsync(`npm whoami --registry ${options.registry}`);
        const username = stdout.trim();
        if (username) {
          logger.success(`Already logged in as ${username} on ${options.registry}`);
          return;
        }
      } catch (error) {
        // Not logged in, proceed with setting token
        logger.info(`Not logged in on ${options.registry}, proceeding to set token...`);
      }

      let token = tokenArg || process.env.NPM_TOKEN;

      if (!token) {
        token = await promptForToken();
      }

      const homeDir = os.homedir();
      const npmrcPath = options.local 
        ? path.join(process.cwd(), '.npmrc')
        : path.join(homeDir, '.npmrc');
      
      // Parse registry URL to get the auth key (e.g., //registry.npmjs.org/)
      const registryUrl = new URL(options.registry);
      const authKey = `//${registryUrl.host}/:_authToken`;
      
      logger.info(`Updating .npmrc at ${npmrcPath}`);
      logger.info(`Setting token for registry: ${options.registry}`);

      let content = '';
      try {
        content = await fs.readFile(npmrcPath, 'utf8');
      } catch (error) {
        // File doesn't exist, create it
        logger.info('Creating new .npmrc file');
      }

      // Split by newline, handling both CRLF and LF
      const lines = content.split(/\r?\n/).filter(line => !line.includes(authKey));
      
      // Add new token
      lines.push(`${authKey}=${token}`);
      
      // Join with OS-specific EOL
      const newContent = lines.join(os.EOL).trim() + os.EOL;

      await fs.writeFile(npmrcPath, newContent, 'utf8');
      
      logger.success('✓ Updated user-level .npmrc with authentication token');
      
    } catch (error) {
      logger.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();

function promptForToken() {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Enter your NPM token: ', (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (!trimmed) {
        reject(new Error('NPM token not provided.'));
      } else {
        resolve(trimmed);
      }
    });
  });
}

