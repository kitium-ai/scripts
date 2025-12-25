#!/usr/bin/env node
/**
 * CLI entry point for addNpmrc function
 * Usage: node bin/add-npmrc.js [--force]
 */

import readline from 'readline';
import chalk from 'chalk';
import { addNpmrc, setNpmToken } from '../dist/git/index.js';

const force = process.argv.includes('--force') || process.argv.includes('-f');

const log = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✔'), msg),
  warn: (msg) => console.log(chalk.yellow('!'), msg),
  error: (msg) => console.error(chalk.red('✖'), msg),
};

function prompt(question, mask = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (mask && rl.output?.isTTY) {
      rl.output.write(question);
      rl.input.on('data', (char) => {
        char = char + '';
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            rl.output.write('\n');
            break;
          default:
            rl.output.write('*');
            break;
        }
      });
    }

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

try {
  await addNpmrc(force);
  log.success('.npmrc template applied');

  const token = await prompt('Enter your npm auth token (leave blank to skip): ', true);
  if (token) {
    await setNpmToken(token, { verify: true });
    log.success('npm token saved to local and user .npmrc');
  } else {
    log.warn('Skipped setting npm token');
  }
} catch (error) {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

