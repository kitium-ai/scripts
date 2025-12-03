#!/usr/bin/env node

/**
 * Automated Security Check Script
 * 
 * Performs comprehensive security validation:
 * - Secret scanning (Gitleaks/TruffleHog)
 * - Dependency vulnerability auditing
 * - License compliance checking
 * - Code quality analysis
 * 
 * Usage:
 *   node bin/security-check.js [options]
 * 
 * Options:
 *   --scanner <tool>     Scanner to use: gitleaks|trufflehog|both (default: both)
 *   --audit              Run npm/pnpm audit
 *   --licenses           Check license compliance
 *   --fail-on-finding    Exit with error if issues found
 *   --verbose            Detailed output
 * 
 * @example
 * ```bash
 * # Full scan
 * node bin/security-check.js --fail-on-finding
 * 
 * # Quick scan
 * node bin/security-check.js --scanner gitleaks --audit
 * ```
 */

import { exec } from '../dist/utils/index.js';
import { scanSecrets, auditDependencies } from '../dist/security/index.js';
import { log } from '../dist/utils/index.js';
import { existsSync } from 'fs';
import { join } from 'path';

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  scanner: args.includes('--scanner') 
    ? args[args.indexOf('--scanner') + 1] 
    : 'both',
  runAudit: args.includes('--audit'),
  checkLicenses: args.includes('--licenses'),
  failOnFinding: args.includes('--fail-on-finding'),
  verbose: args.includes('--verbose')
};

// Track findings
let hasFindings = false;
const findings = {
  secrets: [],
  vulnerabilities: [],
  licenses: []
};

/**
 * Run secret scanning with specified tool
 */
async function runSecretScan(scanner) {
  log('info', `🔍 Running secret scan with ${scanner}...`);
  
  try {
    const result = await scanSecrets({
      scanner,
      failOnFinding: false // We'll handle exit ourselves
    });
    
    if (result.foundSecrets) {
      hasFindings = true;
      findings.secrets.push(...(result.findings || []));
      log('error', `❌ Found ${result.findings?.length || 0} secrets with ${scanner}`);
      
      if (options.verbose && result.findings) {
        result.findings.forEach(f => {
          console.log(`  - ${f.file}:${f.line}: ${f.rule}`);
        });
      }
    } else {
      log('success', `✅ No secrets found with ${scanner}`);
    }
  } catch (error) {
    log('warn', `⚠️ ${scanner} scan failed: ${error.message}`);
    if (options.verbose) {
      console.error(error);
    }
  }
}

/**
 * Run dependency vulnerability audit
 */
async function runDependencyAudit() {
  log('info', '🔍 Running dependency vulnerability audit...');
  
  try {
    const result = await auditDependencies({
      severityThreshold: 'moderate',
      includeDev: true,
      failOnVulnerability: false
    });
    
    if (result.vulnerabilityCount > 0) {
      hasFindings = true;
      findings.vulnerabilities.push(...(result.vulnerabilities || []));
      
      log('error', `❌ Found ${result.vulnerabilityCount} vulnerabilities`);
      if (result.summary) {
        console.log(`  - Critical: ${result.summary.critical || 0}`);
        console.log(`  - High: ${result.summary.high || 0}`);
        console.log(`  - Moderate: ${result.summary.moderate || 0}`);
        console.log(`  - Low: ${result.summary.low || 0}`);
      }
      
      if (options.verbose && result.vulnerabilities) {
        result.vulnerabilities.forEach(v => {
          console.log(`  - ${v.name}@${v.version}: ${v.severity} - ${v.title}`);
        });
      }
    } else {
      log('success', '✅ No vulnerabilities found');
    }
  } catch (error) {
    log('warn', `⚠️ Audit failed: ${error.message}`);
    if (options.verbose) {
      console.error(error);
    }
  }
}

/**
 * Check license compliance
 */
async function checkLicenseCompliance() {
  log('info', '🔍 Checking license compliance...');
  
  const allowlist = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD'];
  const blocklist = ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0'];
  
  try {
    // Use license-checker or similar tool
    const result = await exec('npx', [
      'license-checker',
      '--json',
      '--production'
    ], { cwd: process.cwd() });
    
    const licenses = JSON.parse(result.stdout);
    const violations = [];
    
    for (const [pkg, info] of Object.entries(licenses)) {
      const license = info.licenses || 'UNKNOWN';
      
      // Check against blocklist
      if (blocklist.some(blocked => license.includes(blocked))) {
        violations.push({ package: pkg, license, severity: 'high', reason: 'Blocklisted license' });
      }
      
      // Check against allowlist
      if (!allowlist.some(allowed => license.includes(allowed)) && license !== 'UNKNOWN') {
        violations.push({ package: pkg, license, severity: 'medium', reason: 'Not in allowlist' });
      }
      
      // Check for missing licenses
      if (license === 'UNKNOWN') {
        violations.push({ package: pkg, license, severity: 'low', reason: 'License unknown' });
      }
    }
    
    if (violations.length > 0) {
      hasFindings = true;
      findings.licenses = violations;
      
      log('error', `❌ Found ${violations.length} license compliance issues`);
      
      if (options.verbose) {
        violations.forEach(v => {
          console.log(`  - ${v.package}: ${v.license} (${v.severity}) - ${v.reason}`);
        });
      }
    } else {
      log('success', '✅ All licenses compliant');
    }
  } catch (error) {
    log('warn', `⚠️ License check failed: ${error.message}`);
    if (options.verbose) {
      console.error(error);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔒 KitiumAI Security Check\n');
  
  // 1. Secret scanning
  if (options.scanner === 'gitleaks' || options.scanner === 'both') {
    await runSecretScan('gitleaks');
  }
  
  if (options.scanner === 'trufflehog' || options.scanner === 'both') {
    await runSecretScan('trufflehog');
  }
  
  // 2. Dependency audit
  if (options.runAudit) {
    await runDependencyAudit();
  }
  
  // 3. License compliance
  if (options.checkLicenses) {
    await checkLicenseCompliance();
  }
  
  // Summary
  console.log('\n📊 Security Scan Summary:');
  console.log(`  - Secrets found: ${findings.secrets.length}`);
  console.log(`  - Vulnerabilities: ${findings.vulnerabilities.length}`);
  console.log(`  - License issues: ${findings.licenses.length}`);
  
  // Exit
  if (hasFindings && options.failOnFinding) {
    console.error('\n❌ Security scan failed with findings');
    process.exit(1);
  } else if (hasFindings) {
    console.warn('\n⚠️ Security scan completed with findings (not failing)');
    process.exit(0);
  } else {
    console.log('\n✅ Security scan passed');
    process.exit(0);
  }
}

// Run
main().catch(error => {
  console.error('❌ Security check failed:', error.message);
  if (options.verbose) {
    console.error(error);
  }
  process.exit(1);
});
