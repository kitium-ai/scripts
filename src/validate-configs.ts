#!/usr/bin/env node
/**
 * Configuration Validation Script
 *
 * Validates that packages in the monorepo are using the correct centralized configs:
 * - @kitiumai/config for build/compile tooling (TypeScript, Jest, Vitest, etc.)
 * - @kitiumai/lint for code quality tooling (ESLint, Prettier, Husky, Commitlint)
 *
 * This script detects:
 * - Packages with legacy .eslintrc* files (should use eslint.config.js)
 * - Packages with tsconfig that don't extend @kitiumai/config
 * - Packages with custom eslint configs instead of @kitiumai/lint
 * - Config drift and inconsistencies
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ValidationResult {
  packagePath: string;
  packageName: string;
  errors: string[];
  warnings: string[];
}

interface ValidationSummary {
  totalPackages: number;
  packagesWithErrors: number;
  packagesWithWarnings: number;
  results: ValidationResult[];
}

/**
 * Find all packages in the monorepo
 */
function findPackages(rootDir: string): string[] {
  const packages: string[] = [];
  const packagesDir = join(rootDir, 'packages');
  const toolingDir = join(rootDir, 'tooling');

  const scanDirectory = (dir: string): void => {
    if (!existsSync(dir)) { return; }

    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Check if this directory has a package.json
        if (existsSync(join(fullPath, 'package.json'))) {
          packages.push(fullPath);
        } else {
          // Recurse into subdirectories (for @kitiumai scoped packages)
          scanDirectory(fullPath);
        }
      }
    }
  };

  scanDirectory(packagesDir);
  scanDirectory(toolingDir);

  return packages;
}

/**
 * Validate a single package
 */

function checkLegacyEslint(packagePath: string, result: ValidationResult): void {
  const legacyEslintFiles = [
    '.eslintrc',
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
  ];

  for (const file of legacyEslintFiles) {
    if (existsSync(join(packagePath, file))) {
      result.errors.push(`Found legacy ${file} - should use eslint.config.js with @kitiumai/lint`);
    }
  }
}

function checkTsconfig(packagePath: string, result: ValidationResult): void {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    const extendsValue = tsconfig.extends;

    if (extendsValue) {
      if (!extendsValue.includes('@kitiumai/config')) {
        result.warnings.push(
          `tsconfig.json extends "${extendsValue}" - should extend @kitiumai/config/tsconfig.base.json`
        );
      }
    } else {
      result.warnings.push('tsconfig.json does not extend any base config - should extend @kitiumai/config/tsconfig.base.json');
    }
  }
}

function checkEslintConfig(packagePath: string, packageName: string, result: ValidationResult): void {
  const eslintConfigPath = join(packagePath, 'eslint.config.js');
  if (existsSync(eslintConfigPath)) {
    const eslintConfig = readFileSync(eslintConfigPath, 'utf-8');

    if (!eslintConfig.includes('@kitiumai/lint')) {
      result.warnings.push('eslint.config.js does not import from @kitiumai/lint - should use centralized configs');
    }

    if (eslintConfig.includes('@kitiumai/config/eslint')) {
      result.errors.push(
        'eslint.config.js imports from @kitiumai/config/eslint - should import from @kitiumai/lint/eslint'
      );
    }
  } else {
    const ignoredPackages = ['@kitiumai/config', 'weave', 'weave-ai-docs'];
    if (!ignoredPackages.includes(packageName)) {
      result.warnings.push('Missing eslint.config.js - should have ESLint configuration');
    }
  }
}

function checkPrettierConfig(packagePath: string, result: ValidationResult): void {
  const prettierFiles = ['.prettierrc', '.prettierrc.json', '.prettierrc.js', '.prettierrc.cjs', 'prettier.config.js'];
  for (const file of prettierFiles) {
    if (existsSync(join(packagePath, file))) {
      const content = readFileSync(join(packagePath, file), 'utf-8');
      if (!content.includes('@kitiumai/lint')) {
        result.warnings.push(`${file} does not use @kitiumai/lint - should import prettierConfig from @kitiumai/lint`);
      }
    }
  }
}

function checkLintStagedConfig(packagePath: string, result: ValidationResult): void {
  const lintStagedPath = join(packagePath, 'lint-staged.config.cjs');
  if (existsSync(lintStagedPath)) {
    const content = readFileSync(lintStagedPath, 'utf-8');
    if (content.includes('@kitiumai/config/lint-staged')) {
      result.errors.push(
        'lint-staged.config.cjs imports from @kitiumai/config/lint-staged.config.cjs - should use @kitiumai/lint/configs/lint-staged'
      );
    }
  }
}

function checkDependencies(
  packagePath: string,
  packageName: string,
  packageJson: { devDependencies?: Record<string, string> },
  result: ValidationResult
): void {
  const developmentDeps = packageJson.devDependencies || {};
  const eslintConfigPath = join(packagePath, 'eslint.config.js');

  if (existsSync(eslintConfigPath)) {
    if (!developmentDeps['@kitiumai/lint'] && !packageName.includes('@kitiumai/lint')) {
      result.warnings.push('Package uses ESLint but does not have @kitiumai/lint in devDependencies');
    }
  }

  const oldDeps = ['@eslint/js', 'eslint-config-prettier', 'eslint-plugin-prettier'];
  for (const dep of oldDeps) {
    if (developmentDeps[dep] && developmentDeps['@kitiumai/lint']) {
      result.warnings.push(
        `Package has both @kitiumai/lint and ${dep} - ${dep} is provided by @kitiumai/lint and can be removed`
      );
    }
  }
}

function validatePackage(packagePath: string, monorepoRoot: string): ValidationResult {
  const packageJsonPath = join(packagePath, 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  const packageName = packageJson.name || relative(monorepoRoot, packagePath);

  const result: ValidationResult = {
    packagePath: relative(monorepoRoot, packagePath),
    packageName,
    errors: [],
    warnings: [],
  };

  checkLegacyEslint(packagePath, result);
  checkTsconfig(packagePath, result);
  checkEslintConfig(packagePath, packageName, result);
  checkPrettierConfig(packagePath, result);
  checkLintStagedConfig(packagePath, result);
  checkDependencies(packagePath, packageName, packageJson, result);

  return result;
}


/**
 * Run validation on all packages
 */
function runValidation(): ValidationSummary {
  const monorepoRoot = join(__dirname, '../../..');
  const packages = findPackages(monorepoRoot);

  const results: ValidationResult[] = [];
  let packagesWithErrors = 0;
  let packagesWithWarnings = 0;

  for (const packagePath of packages) {
    const result = validatePackage(packagePath, monorepoRoot);
    results.push(result);

    if (result.errors.length > 0) { packagesWithErrors++; }
    if (result.warnings.length > 0) { packagesWithWarnings++; }
  }

  return {
    totalPackages: packages.length,
    packagesWithErrors,
    packagesWithWarnings,
    results,
  };
}

/**
 * Print validation results
 */
function printResults(summary: ValidationSummary, verbose = false): void {
  console.log('\n🔍 Configuration Validation Results\n');
  console.log(`Total packages scanned: ${summary.totalPackages}`);
  console.log(`Packages with errors: ${summary.packagesWithErrors}`);
  console.log(`Packages with warnings: ${summary.packagesWithWarnings}\n`);

  // Print errors
  const packagesWithErrors = summary.results.filter(r => r.errors.length > 0);
  if (packagesWithErrors.length > 0) {
    console.log('❌ Packages with errors:\n');
    for (const result of packagesWithErrors) {
      console.log(`  ${result.packageName} (${result.packagePath})`);
      for (const error of result.errors) {
        console.log(`    • ${error}`);
      }
      console.log('');
    }
  }

  // Print warnings
  const packagesWithWarnings = summary.results.filter(r => r.warnings.length > 0);
  if (packagesWithWarnings.length > 0 && verbose) {
    console.log('⚠️  Packages with warnings:\n');
    for (const result of packagesWithWarnings) {
      console.log(`  ${result.packageName} (${result.packagePath})`);
      for (const warning of result.warnings) {
        console.log(`    • ${warning}`);
      }
      console.log('');
    }
  } else if (packagesWithWarnings.length > 0) {
    console.log(`⚠️  ${packagesWithWarnings.length} packages have warnings (use --verbose to see details)\n`);
  }

  // Summary
  if (summary.packagesWithErrors === 0 && summary.packagesWithWarnings === 0) {
    console.log('✅ All packages are using correct configurations!\n');
  } else if (summary.packagesWithErrors === 0) {
    console.log('✅ No errors found, but there are warnings to address.\n');
  } else {
    console.log('❌ Configuration validation failed. Please fix the errors above.\n');
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');

const summary = runValidation();
printResults(summary, verbose);
