#!/usr/bin/env node

/**
 * CLI entry point for fix-deprecated-deps
 * 
 * Usage:
 *   fix-deprecated-deps [--fix] [--package <path>]
 */

import { fixDeprecatedDeps } from '../dist/deps/index.js';

const args = process.argv.slice(2);
const autoFix = args.includes('--fix');
const packageArg = args.find(arg => arg.startsWith('--package='));
const packagePath = packageArg ? packageArg.split('=')[1] : undefined;

fixDeprecatedDeps(packagePath, autoFix).catch((error) => {
  console.error('Error:', error.message);
  console.error(error);
  process.exit(1);
});

