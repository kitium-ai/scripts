#!/usr/bin/env node

/**
 * License Compliance Checker
 * 
 * Validates that all dependencies use acceptable licenses.
 * Supports allowlists, blocklists, and custom policies.
 * 
 * Usage:
 *   node bin/license-compliance.js [options]
 * 
 * Options:
 *   --production         Check only production dependencies (default: true)
 *   --dev                Include dev dependencies
 *   --config <path>      Path to license config file
 *   --output <path>      Export results to JSON file
 *   --fail-on-violation  Exit with error if violations found
 *   --verbose            Detailed output
 * 
 * @example
 * ```bash
 * # Check production deps
 * node bin/license-compliance.js --fail-on-violation
 * 
 * # Include dev deps with custom config
 * node bin/license-compliance.js --dev --config ./license-config.json
 * ```
 */

import { exec } from '../dist/utils/index.js';
import { log } from '../dist/utils/index.js';
import { readJson, writeJson } from '../dist/utils/index.js';
import { existsSync } from 'fs';
import { join } from 'path';

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  production: !args.includes('--dev'),
  configPath: args.includes('--config') 
    ? args[args.indexOf('--config') + 1] 
    : null,
  outputPath: args.includes('--output') 
    ? args[args.indexOf('--output') + 1] 
    : null,
  failOnViolation: args.includes('--fail-on-violation'),
  verbose: args.includes('--verbose')
};

// Default license policy
const defaultPolicy = {
  allowlist: [
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    '0BSD',
    'CC0-1.0',
    'Unlicense'
  ],
  blocklist: [
    'GPL-3.0',
    'GPL-2.0',
    'AGPL-3.0',
    'LGPL-3.0',
    'LGPL-2.1'
  ],
  warnings: [
    'CC-BY-4.0',
    'CC-BY-SA-4.0'
  ],
  exemptions: {
    // Package exemptions: { "package-name": "reason for exemption" }
  }
};

/**
 * Load license policy from config file or use defaults
 */
async function loadPolicy() {
  if (options.configPath && existsSync(options.configPath)) {
    log('info', `Loading policy from ${options.configPath}`);
    try {
      const customPolicy = await readJson(options.configPath);
      return { ...defaultPolicy, ...customPolicy };
    } catch (error) {
      log('warn', `Failed to load config, using defaults: ${error.message}`);
      return defaultPolicy;
    }
  }
  return defaultPolicy;
}

/**
 * Get all package licenses using license-checker
 */
async function getPackageLicenses() {
  log('info', '📦 Scanning package licenses...');
  
  const licenseCheckerArgs = [
    'license-checker',
    '--json'
  ];
  
  if (options.production) {
    licenseCheckerArgs.push('--production');
  }
  
  try {
    const result = await exec('npx', licenseCheckerArgs, {
      cwd: process.cwd()
    });
    
    return JSON.parse(result.stdout);
  } catch (error) {
    // Try fallback to pnpm licenses
    try {
      log('info', 'Falling back to pnpm licenses...');
      const result = await exec('pnpm', ['licenses', 'list', '--json'], {
        cwd: process.cwd()
      });
      
      // Convert pnpm format to license-checker format
      const pnpmData = JSON.parse(result.stdout);
      const converted = {};
      
      for (const pkg of pnpmData) {
        const key = `${pkg.name}@${pkg.version}`;
        converted[key] = {
          licenses: pkg.license,
          repository: pkg.repository,
          publisher: pkg.author,
          path: pkg.path
        };
      }
      
      return converted;
    } catch (fallbackError) {
      throw new Error(`Failed to get licenses: ${error.message}`);
    }
  }
}

/**
 * Normalize license string (handle SPDX expressions)
 */
function normalizeLicense(license) {
  if (!license || license === 'UNKNOWN') {
    return 'UNKNOWN';
  }
  
  // Handle arrays
  if (Array.isArray(license)) {
    return license.join(' OR ');
  }
  
  // Handle objects
  if (typeof license === 'object' && license.type) {
    return license.type;
  }
  
  // Clean up string
  return String(license)
    .replace(/[()]/g, '')
    .replace(/\s+AND\s+/gi, ' AND ')
    .replace(/\s+OR\s+/gi, ' OR ')
    .trim();
}

/**
 * Check if license matches any in list (supports OR expressions)
 */
function matchesLicense(license, licenseList) {
  const normalized = normalizeLicense(license);
  
  // Handle OR expressions
  if (normalized.includes(' OR ')) {
    const parts = normalized.split(' OR ').map(p => p.trim());
    return parts.some(part => licenseList.some(allowed => part.includes(allowed)));
  }
  
  // Handle AND expressions (all must match)
  if (normalized.includes(' AND ')) {
    const parts = normalized.split(' AND ').map(p => p.trim());
    return parts.every(part => licenseList.some(allowed => part.includes(allowed)));
  }
  
  // Simple match
  return licenseList.some(item => normalized.includes(item));
}

/**
 * Validate licenses against policy
 */
async function validateLicenses(packages, policy) {
  log('info', '🔍 Validating licenses against policy...');
  
  const results = {
    total: 0,
    compliant: 0,
    violations: [],
    warnings: [],
    unknown: []
  };
  
  for (const [pkgName, info] of Object.entries(packages)) {
    results.total++;
    
    const license = normalizeLicense(info.licenses);
    
    // Check exemptions
    if (policy.exemptions[pkgName]) {
      if (options.verbose) {
        log('info', `  ✓ ${pkgName}: ${license} (EXEMPTED: ${policy.exemptions[pkgName]})`);
      }
      results.compliant++;
      continue;
    }
    
    // Check blocklist
    if (matchesLicense(license, policy.blocklist)) {
      results.violations.push({
        package: pkgName,
        license,
        severity: 'high',
        reason: 'Blocklisted license (copyleft/incompatible)',
        path: info.path
      });
      continue;
    }
    
    // Check unknown
    if (license === 'UNKNOWN' || !license) {
      results.unknown.push({
        package: pkgName,
        license: 'UNKNOWN',
        severity: 'medium',
        reason: 'License not specified',
        path: info.path
      });
      continue;
    }
    
    // Check warnings
    if (matchesLicense(license, policy.warnings)) {
      results.warnings.push({
        package: pkgName,
        license,
        severity: 'low',
        reason: 'License requires review',
        path: info.path
      });
    }
    
    // Check allowlist
    if (matchesLicense(license, policy.allowlist)) {
      if (options.verbose) {
        log('success', `  ✓ ${pkgName}: ${license}`);
      }
      results.compliant++;
    } else {
      results.violations.push({
        package: pkgName,
        license,
        severity: 'medium',
        reason: 'License not in allowlist',
        path: info.path
      });
    }
  }
  
  return results;
}

/**
 * Print validation results
 */
function printResults(results) {
  console.log('\n📊 License Compliance Report:\n');
  
  // Summary
  console.log(`Total packages: ${results.total}`);
  console.log(`Compliant: ${results.compliant} (${Math.round(results.compliant / results.total * 100)}%)`);
  console.log(`Violations: ${results.violations.length}`);
  console.log(`Warnings: ${results.warnings.length}`);
  console.log(`Unknown: ${results.unknown.length}`);
  
  // Violations
  if (results.violations.length > 0) {
    console.log('\n❌ License Violations:');
    results.violations.forEach(v => {
      console.log(`  - ${v.package}`);
      console.log(`    License: ${v.license}`);
      console.log(`    Severity: ${v.severity.toUpperCase()}`);
      console.log(`    Reason: ${v.reason}`);
      if (options.verbose && v.path) {
        console.log(`    Path: ${v.path}`);
      }
    });
  }
  
  // Warnings
  if (results.warnings.length > 0) {
    console.log('\n⚠️ License Warnings:');
    results.warnings.forEach(w => {
      console.log(`  - ${w.package}: ${w.license} - ${w.reason}`);
    });
  }
  
  // Unknown
  if (results.unknown.length > 0) {
    console.log('\n❔ Unknown Licenses:');
    results.unknown.forEach(u => {
      console.log(`  - ${u.package}: License information missing`);
    });
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('📜 KitiumAI License Compliance Checker\n');
  
  // Load policy
  const policy = await loadPolicy();
  log('info', `Policy loaded (${policy.allowlist.length} allowed, ${policy.blocklist.length} blocked)`);
  
  // Get licenses
  const packages = await getPackageLicenses();
  log('success', `Found ${Object.keys(packages).length} packages`);
  
  // Validate
  const results = await validateLicenses(packages, policy);
  
  // Export if requested
  if (options.outputPath) {
    await writeJson(options.outputPath, {
      timestamp: new Date().toISOString(),
      policy,
      results
    }, true);
    log('success', `Results exported to ${options.outputPath}`);
  }
  
  // Print results
  printResults(results);
  
  // Exit
  const hasIssues = results.violations.length > 0 || results.unknown.length > 0;
  
  if (hasIssues && options.failOnViolation) {
    console.error('\n❌ License compliance check failed');
    process.exit(1);
  } else if (hasIssues) {
    console.warn('\n⚠️ License compliance check completed with issues');
    process.exit(0);
  } else {
    console.log('\n✅ License compliance check passed');
    process.exit(0);
  }
}

// Run
main().catch(error => {
  console.error('❌ License compliance check failed:', error.message);
  if (options.verbose) {
    console.error(error);
  }
  process.exit(1);
});
