#!/usr/bin/env node
/**
 * Ensure .changeset directory and config.json exist before running changeset
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function ensureChangeset() {
  try {
    // Create .changeset directory if it doesn't exist
    try {
      await fs.access(changesetDir);
    } catch {
      await fs.mkdir(changesetDir, { recursive: true });
      console.log('✓ Created .changeset directory');
    }

    // Create config.json if it doesn't exist
    try {
      await fs.access(configPath);
    } catch {
      await fs.writeFile(
        configPath,
        JSON.stringify(defaultConfig, null, 2) + '\n',
        'utf-8'
      );
      console.log('✓ Created .changeset/config.json');
    }
  } catch (error) {
    console.error('Error setting up .changeset:', error.message);
    process.exit(1);
  }
}

ensureChangeset();

