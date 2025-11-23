#!/usr/bin/env node
/**
 * CLI entry point for setNpmToken function
 * Usage: node bin/set-npm-token.js [token]
 */

import { setNpmToken } from '../dist/git/index.js';

const token = process.argv[2] || process.env.NPM_TOKEN;

try {
  await setNpmToken(token);
} catch (error) {
  console.error('Error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}

