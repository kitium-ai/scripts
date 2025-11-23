#!/usr/bin/env node
/**
 * CLI entry point for addNpmrc function
 * Usage: node bin/add-npmrc.js [--force]
 */

import { addNpmrc } from '../dist/git/index.js';

const force = process.argv.includes('--force') || process.argv.includes('-f');

try {
  await addNpmrc(force);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

