/**
 * Deprecated dependency detection and fixing utilities
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { log, readJson, writeJson } from '../utils/index.js';

/**
 * Fix information for deprecated packages
 */
export interface DeprecatedFix {
  reason: string;
  fix: 'override' | 'update-parent';
  override?: string;
  version?: string;
  alternative?: string;
  parent?: string;
  note?: string;
}

/**
 * Deprecated package information
 */
export interface DeprecatedPackage {
  name: string;
  version: string;
  reason?: string;
  via?: string[];
  fixInfo?: DeprecatedFix;
}

/**
 * Known deprecated packages and their fixes
 */
export const DEPRECATED_FIXES: Record<string, DeprecatedFix> = {
  'lodash.get': {
    reason: 'lodash.get is deprecated. Use native optional chaining or lodash.get from lodash directly.',
    fix: 'override',
    override: 'lodash',
    version: '^4.17.21',
    alternative: 'Use optional chaining (?.) or lodash.get from main lodash package'
  },
  'subscriptions-transport-ws': {
    reason: 'subscriptions-transport-ws is deprecated. This is likely from eslint-plugin-graphql.',
    fix: 'update-parent',
    parent: 'eslint-plugin-graphql',
    alternative: 'Update eslint-plugin-graphql to latest version or consider removing if not needed',
    note: 'Cannot directly replace with graphql-ws as APIs differ. Update parent package instead.'
  }
};

/**
 * Find package.json in a directory
 */
export function findPackageJson(startDir: string): string | null {
  let currentDir = resolve(startDir);
  const maxLevels = 10;
  let levels = 0;

  while (currentDir && levels < maxLevels) {
    const packageJsonPath = join(currentDir, 'package.json');
    if (existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) { break; }
    currentDir = parentDir;
    levels++;
  }

  return null;
}

/**
 * Get package manager (npm, pnpm, yarn)
 */
export function getPackageManager(packageJsonPath: string): 'npm' | 'pnpm' | 'yarn' {
  const packageDir = dirname(packageJsonPath);

  if (existsSync(join(packageDir, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (existsSync(join(packageDir, 'yarn.lock'))) {
    return 'yarn';
  }
  if (existsSync(join(packageDir, 'package-lock.json'))) {
    return 'npm';
  }

  // Check parent for monorepo
  const parentDir = dirname(packageDir);
  if (existsSync(join(parentDir, 'pnpm-workspace.yaml'))) {
    return 'pnpm';
  }

  return 'npm'; // default
}

/**
 * Check for deprecated dependencies using npm/pnpm
 */

function checkAuditStats(
  packageManager: 'pnpm' | 'yarn' | 'npm',
  packageDir: string,
  deprecated: DeprecatedPackage[]
): void {
  try {
    let auditOutput = '';
    if (packageManager === 'pnpm') {
      auditOutput = execSync('pnpm audit --json', {
        cwd: packageDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      auditOutput = execSync('npm audit --json', {
        cwd: packageDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    const audit = JSON.parse(auditOutput) as { vulnerabilities?: Record<string, { deprecated?: string; range?: string; via?: string[] }> };
    if (audit.vulnerabilities) {
      for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
        if (vuln.deprecated) {
          deprecated.push({
            name,
            version: vuln.range || 'unknown',
            reason: vuln.deprecated,
            via: vuln.via || []
          });
        }
      }
    }
  } catch {
    log('warn', 'Could not run audit, trying alternative method...');
  }
}

function checkKnownDeprecated(
  packageManager: 'pnpm' | 'yarn' | 'npm',
  packageDir: string,
  deprecated: DeprecatedPackage[]
): void {
  for (const [depName, fixInfo] of Object.entries(DEPRECATED_FIXES)) {
    try {
      let lsOutput = '';
      const command = packageManager === 'pnpm'
        ? `pnpm list ${depName} --depth=10`
        : `npm ls ${depName} --depth=10`;

      lsOutput = execSync(command, {
        cwd: packageDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      if (lsOutput.includes(depName)) {
        const versionMatch = lsOutput.match(new RegExp(`${depName}@([^\\s]+)`));
        const version = versionMatch ? versionMatch[1] : 'unknown';

        deprecated.push({
          name: depName,
          version,
          reason: fixInfo.reason,
          via: [],
          fixInfo
        });
      }
    } catch {
      // Package not found, skip
    }
  }
}

export function checkDeprecatedDeps(packageJsonPath: string): Promise<DeprecatedPackage[]> {
  const packageDir = dirname(packageJsonPath);
  const packageManager = getPackageManager(packageJsonPath);

  log('info', `Checking for deprecated dependencies using ${packageManager}...`);

  const deprecated: DeprecatedPackage[] = [];

  try {
    checkAuditStats(packageManager, packageDir, deprecated);
    checkKnownDeprecated(packageManager, packageDir, deprecated);
  } catch (error) {
    log('error', `Error checking deprecated dependencies: ${error instanceof Error ? error.message : String(error)}`);
  }

  return Promise.resolve(deprecated);
}

/**
 * Find which packages depend on a deprecated package
 */
export function findDependents(packageJsonPath: string, depName: string): string[] {
  const packageDir = dirname(packageJsonPath);
  const packageManager = getPackageManager(packageJsonPath);

  try {
    let lsOutput = '';
    if (packageManager === 'pnpm') {
      lsOutput = execSync(`pnpm why ${depName}`, {
        cwd: packageDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      lsOutput = execSync(`npm why ${depName}`, {
        cwd: packageDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    // Parse output to find dependents
    const dependents: string[] = [];
    const lines = lsOutput.split('\n');

    for (const line of lines) {
      // Look for package names in the dependency tree
      const match = line.match(/([^@\s]+@[^@\s]+)/);
      if (match && !match[1].includes(depName)) {
        const package_ = match[1].split('@')[0];
        if (package_ && !dependents.includes(package_)) {
          dependents.push(package_);
        }
      }
    }

    return dependents;
  } catch (error) {
    log('warn', `Could not find dependents for ${depName}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

/**
 * Apply fixes for deprecated dependencies
 */

/**
 * Apply override for a deprecated dependency
 */

function applyPnpmOverride(
  packageJson: { pnpm?: { overrides?: Record<string, string> } },
  dep: DeprecatedPackage,
  overrideKey: string,
  overrideVersion: string,
  autoFix: boolean
): boolean {
  if (!packageJson.pnpm?.overrides) {
    if (!packageJson.pnpm) { packageJson.pnpm = {}; }
    packageJson.pnpm.overrides = {};
  }

  const overrides = packageJson.pnpm.overrides;

  if (!overrides[overrideKey] || overrides[overrideKey] !== overrideVersion) {
    if (autoFix || confirm(`Add override for ${overrideKey}@${overrideVersion}?`)) {
      // For pnpm, use npm: prefix for package replacement
      if (dep.fixInfo?.override && dep.fixInfo.override !== dep.name) {
        overrides[dep.name] = `npm:${overrideKey}@${overrideVersion}`;
      } else {
        overrides[overrideKey] = overrideVersion;
      }
      log('success', `Added pnpm override: ${dep.name} -> ${overrideKey}@${overrideVersion}`);
      return true;
    }
  }
  return false;
}

function applyNpmOverride(
  packageJson: { overrides?: Record<string, string> },
  overrideKey: string,
  overrideVersion: string,
  autoFix: boolean
): boolean {
  if (!packageJson.overrides) {
    packageJson.overrides = {};
  }

  if (!packageJson.overrides[overrideKey] || packageJson.overrides[overrideKey] !== overrideVersion) {
    if (autoFix || confirm(`Add override for ${overrideKey}@${overrideVersion}?`)) {
      packageJson.overrides[overrideKey] = overrideVersion;
      log('success', `Added npm override: ${overrideKey}@${overrideVersion}`);
      return true;
    }
  }
  return false;
}

interface PackageJsonWithOverrides {
  pnpm?: { overrides?: Record<string, string> };
  overrides?: Record<string, string>;
}

function applyOverride(
  packageJson: PackageJsonWithOverrides,
  dep: DeprecatedPackage,
  packageManager: 'pnpm' | 'yarn' | 'npm',
  autoFix: boolean
): boolean {
  if (!dep.fixInfo) { return false; }

  const fixInfo = dep.fixInfo;
  const overrideKey = fixInfo.override || dep.name;
  const overrideVersion = fixInfo.version;

  if (!overrideVersion) {
    log('warn', `No version specified for override of ${dep.name}`);
    return false;
  }

  if (packageManager === 'pnpm') {
    return applyPnpmOverride(packageJson, dep, overrideKey, overrideVersion, autoFix);
  }

  return applyNpmOverride(packageJson, overrideKey, overrideVersion, autoFix);
}


/**
 * Apply fixes for deprecated dependencies
 */

function processDeprecatedList(
  deprecated: DeprecatedPackage[],
  packageJson: PackageJsonWithOverrides,
  packageManager: 'pnpm' | 'yarn' | 'npm',
  autoFix: boolean
): boolean {

  let hasChanges = false;

  for (const dep of deprecated) {
    if (!dep.fixInfo) {
      log('warn', `No fix info for ${dep.name}, skipping...`);
      continue;
    }

    const fixInfo = dep.fixInfo;

    if (fixInfo.fix === 'override') {
      const changed = applyOverride(packageJson, dep, packageManager, autoFix);
      if (changed) { hasChanges = true; }
    } else if (fixInfo.fix === 'update-parent') {
      const parentPackage = fixInfo.parent;
      if (parentPackage) {
        log('info', `For ${dep.name}, consider updating parent package: ${parentPackage}`);
        log('info', `  ${fixInfo.alternative || 'Update to latest version'}`);
        if (fixInfo.note) {
          log('info', `  Note: ${fixInfo.note}`);
        }
      }
    }
  }

  return hasChanges;
}

export async function applyFixes(
  packageJsonPath: string,
  deprecated: DeprecatedPackage[],
  autoFix = false
): Promise<boolean> {
  const packageJson = await readJson<{
    pnpm?: { overrides?: Record<string, string> };
    overrides?: Record<string, string>;
  }>(packageJsonPath);
  const packageDir = dirname(packageJsonPath);
  const packageManager = getPackageManager(packageJsonPath);

  // Ensure structure exists
  if (!packageJson.pnpm && packageManager === 'pnpm') {
    packageJson.pnpm = {};
  }
  if (!packageJson.overrides && packageManager === 'npm') {
    packageJson.overrides = {};
  }

  const hasChanges = processDeprecatedList(deprecated, packageJson, packageManager, autoFix);

  if (hasChanges) {
    await writeJson(packageJsonPath, packageJson);
    log('success', 'Updated package.json with fixes');

    // Install dependencies
    log('info', 'Installing updated dependencies...');
    try {
      const command = packageManager === 'pnpm' ? 'pnpm install' : 'npm install';
      execSync(command, { cwd: packageDir, stdio: 'inherit' });
      log('success', 'Dependencies installed successfully');
    } catch (error) {
      log('error', `Error installing dependencies: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return hasChanges;
}


/**
 * Simple confirm function (for non-interactive mode, defaults to true)
 */
function confirm(_message: string): boolean {
  if (process.env.CI || process.env.NON_INTERACTIVE) {
    return true;
  }
  // In interactive mode, you'd use readline, but for simplicity, auto-confirm
  return true;
}

/**
 * Main function to check and fix deprecated dependencies
 */
export async function fixDeprecatedDeps(
  packagePath?: string,
  autoFix = false
): Promise<void> {
  log('info', '🔍 Deprecated Dependency Checker\n');

  const startDir = packagePath || process.cwd();
  const packageJsonPath = findPackageJson(startDir);
  if (!packageJsonPath) {
    log('error', 'Could not find package.json');
    throw new Error('Could not find package.json');
  }

  log('info', `Checking package: ${packageJsonPath}\n`);

  // Check for deprecated dependencies
  const deprecated = await checkDeprecatedDeps(packageJsonPath);

  if (deprecated.length === 0) {
    log('success', '✅ No deprecated dependencies found!');
    return;
  }

  log('warn', `⚠️  Found ${deprecated.length} deprecated dependency/dependencies:\n`);

  // Display deprecated dependencies
  for (const dep of deprecated) {
    log('warn', `  • ${dep.name}@${dep.version}`);
    log('info', `    Reason: ${dep.reason || 'Deprecated'}`);

    if (dep.fixInfo) {
      log('info', `    Fix: ${dep.fixInfo.alternative || dep.fixInfo.fix}`);
    }

    // Find dependents
    const dependents = findDependents(packageJsonPath, dep.name);
    if (dependents.length > 0) {
      log('info', `    Used by: ${dependents.join(', ')}`);
    }

    log('info', '');
  }

  // Apply fixes
  if (autoFix) {
    log('info', 'Applying fixes...\n');
    await applyFixes(packageJsonPath, deprecated, autoFix);
  } else {
    log('info', 'Run with autoFix=true to automatically apply fixes');
  }
}
