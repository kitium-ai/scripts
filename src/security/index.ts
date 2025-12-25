import { existsSync } from 'node:fs';
import path from 'node:path';

import { findPackageJson, getPackageManager } from '../deps/index.js';
import { exec, findFiles, log, readJson } from '../utils/index.js';

type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'info';

export interface SecretScanOptions {
  scanner?: 'gitleaks' | 'trufflehog';
  source?: string;
  configPath?: string;
  cwd?: string;
  failOnFinding?: boolean;
  extraArgs?: string[];
}

export interface SecretScanFinding {
  rule?: string;
  file?: string;
  line?: number;
  commit?: string;
  author?: string;
  secret?: string;
}

export interface SecretScanResult {
  scanner: 'gitleaks' | 'trufflehog';
  findings: SecretScanFinding[];
  exitCode: number;
  rawOutput: string;
}

function parseJsonLines(output: string): SecretScanFinding[] {
  const findings: SecretScanFinding[] = [];
  const lines = output.split('\n').map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as SecretScanFinding;
      findings.push(parsed);
    } catch {
      // ignore lines that aren't JSON
    }
  }
  return findings;
}


function buildScannerArgs(scanner: 'gitleaks' | 'trufflehog', source: string, configPath?: string): string[] {
  const args: string[] = [];
  if (scanner === 'gitleaks') {
    args.push('detect', '--source', source, '--no-banner', '--redact', '--report-format', 'json');
    if (configPath) {
      args.push('--config', configPath);
    }
  } else {
    // trufflehog
    args.push('filesystem', source, '--json');
    if (configPath) {
      args.push('--rules', configPath);
    }
  }
  return args;
}

export async function scanSecrets(options: SecretScanOptions = {}): Promise<SecretScanResult> {
  const {
    scanner = 'gitleaks',
    source = process.cwd(),
    configPath,
    cwd = process.cwd(),
    failOnFinding = true,
    extraArgs: extraArguments = [],
  } = options;

  const args = buildScannerArgs(scanner, source, configPath);
  args.push(...extraArguments);

  const baseCommand = scanner === 'gitleaks' ? 'gitleaks' : 'trufflehog';
  let result = await exec(baseCommand, args, { cwd, throwOnError: false });

  const missingBinary =
    result.code === 127 ||
    /not recognized|command not found|ENOENT|could not find/i.test(result.stderr);

  if (missingBinary) {
    const package_ = scanner === 'gitleaks' ? 'gitleaks@latest' : 'trufflehog@latest';
    result = await exec('npx', ['--yes', package_, ...args], { cwd, throwOnError: false });
  }

  const findings = parseJsonLines(result.stdout);
  const total = findings.length;
  if (total > 0) {
    log('warn', `Secret scanner ${scanner} found ${total} potential leak(s).`);
    if (failOnFinding) {
      throw new Error('Secret scan found leaks. See log for details.');
    }
  } else {
    log('success', `Secret scanner ${scanner} reported no findings.`);
  }

  return {
    scanner,
    findings,
    exitCode: result.code,
    rawOutput: result.stdout,
  };
}


export interface AuditAdvisory {
  module: string;
  severity: Severity;
  dependencyType?: 'prod' | 'dev' | 'optional';
  title?: string;
  url?: string;
  range?: string;
}

export interface AuditSummary {
  total: number;
  severityCounts: Record<Severity, number>;
  advisories: AuditAdvisory[];
}

export interface AuditOptions {
  packagePath?: string;
  severityThreshold?: Severity;
  includeDev?: boolean;
  cwd?: string;
}

const severityOrder: Severity[] = ['info', 'low', 'moderate', 'high', 'critical'];

function isSeverityAllowed(target: Severity, threshold: Severity): boolean {
  return severityOrder.indexOf(target) >= severityOrder.indexOf(threshold);
}

function pickJsonObject(payload: string): unknown {
  const trimmed = payload.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // try to find last valid JSON block (pnpm audit prints info banners)
    const lines = trimmed.split('\n').reverse();
    for (const line of lines) {
      try {
        return JSON.parse(line);
      } catch {
        continue;
      }
    }
  }
  return {};
}


interface RawAdvisory {
  module_name: string;
  severity: Severity;
  title?: string;
  url?: string;
  vulnerable_versions?: string;
}

interface RawVulnerability {
  severity?: Severity;
  via?: Array<string | {
    title?: string;
    url?: string;
    range?: string;
  }>;
}

interface RawAuditOutput {
  advisories?: Record<string, RawAdvisory>;
  vulnerabilities?: Record<string, RawVulnerability>;
  metadata?: {
    vulnerabilities?: Record<Severity, number>;
  };
}


function processAdvisories(
  advisoriesRecord: Record<string, RawAdvisory>,
  severityThreshold: Severity,
  advisories: AuditAdvisory[],
  severityCounts: Record<Severity, number>
): void {
  for (const advisory of Object.values(advisoriesRecord)) {
    if (!isSeverityAllowed(advisory.severity, severityThreshold)) {
      continue;
    }
    advisories.push({
      module: advisory.module_name,
      severity: advisory.severity,
      title: advisory.title,
      url: advisory.url,
      range: advisory.vulnerable_versions,
    });
    severityCounts[advisory.severity] += 1;
  }
}

function processVulnerabilities(
  vulnerabilitiesRecord: Record<string, RawVulnerability>,
  severityThreshold: Severity,
  advisories: AuditAdvisory[],
  severityCounts: Record<Severity, number>
): void {
  for (const [module, vuln] of Object.entries(vulnerabilitiesRecord)) {
    const severity = vuln.severity ?? 'info';
    if (!isSeverityAllowed(severity, severityThreshold)) {
      continue;
    }
    const via = vuln.via?.[0];
    const isObject = typeof via === 'object';
    advisories.push({
      module,
      severity,
      title: isObject ? via.title : undefined,
      url: isObject ? via.url : undefined,
      range: isObject ? via.range : undefined,
    });
    severityCounts[severity] += 1;
  }
}

function processMetadata(
  metadataVulnerabilities: Record<Severity, number>,
  severityThreshold: Severity,
  severityCounts: Record<Severity, number>
): void {
  for (const level of Object.keys(metadataVulnerabilities) as Severity[]) {
    if (!isSeverityAllowed(level, severityThreshold)) {
      continue;
    }
    severityCounts[level] += metadataVulnerabilities[level] ?? 0;
  }
}

function processAuditResults(
  raw: unknown,
  severityThreshold: Severity
): { advisories: AuditAdvisory[]; severityCounts: Record<Severity, number> } {
  const severityCounts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };
  const advisories: AuditAdvisory[] = [];

  const data = raw as RawAuditOutput;

  if (data?.advisories) {
    processAdvisories(data.advisories, severityThreshold, advisories, severityCounts);
  } else if (data?.vulnerabilities) {
    processVulnerabilities(data.vulnerabilities, severityThreshold, advisories, severityCounts);
  } else if (data?.metadata?.vulnerabilities) {
    processMetadata(data.metadata.vulnerabilities, severityThreshold, severityCounts);
  }

  return { advisories, severityCounts };
}


export async function auditDependencies(options: AuditOptions = {}): Promise<AuditSummary> {
  const { packagePath = process.cwd(), severityThreshold = 'low', includeDev: includeDevelopment = false, cwd } = options;
  const packageJsonPath = findPackageJson(packagePath);
  if (!packageJsonPath) {
    throw new Error(`Could not locate package.json near ${packagePath}`);
  }

  const manager = getPackageManager(packageJsonPath);
  const auditArguments =
    manager === 'pnpm'
      ? ['audit', '--json', includeDevelopment ? '--dev' : '--prod']
      : ['audit', '--json', includeDevelopment ? '--dev' : '--production'];
  const auditResult = await exec(manager, auditArguments, {
    cwd: cwd ?? path.dirname(packageJsonPath),
    throwOnError: false,
  });

  const raw = pickJsonObject(auditResult.stdout);
  const { advisories, severityCounts } = processAuditResults(raw, severityThreshold);
  const total = advisories.length || Object.values(severityCounts).reduce((sum, value) => sum + value, 0);

  if (total === 0) {
    log('success', 'Dependency audit is clean for the selected threshold.');
  } else {
    log('warn', `Dependency audit found ${total} issue(s) at ${severityThreshold}+ severity.`);
  }

  return { total, severityCounts, advisories };
}


export interface PolicyConfig {
  allowedLicenses: string[];
  blockedLicenses: string[];
  maxCriticalVulns: number;
  maxHighVulns: number;
}

export interface PolicyCheckOptions {
  policyFile?: string;
  licenseReportPath?: string;
  auditSummary?: AuditSummary;
  fallbackPolicy?: Partial<PolicyConfig>;
}

export interface PolicyCheckResult {
  passed: boolean;
  violations: string[];
  checkedLicenses: Array<{ name: string; license: string }>;
}

const defaultPolicy: PolicyConfig = {
  allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  blockedLicenses: ['GPL-3.0', 'AGPL-3.0'],
  maxCriticalVulns: 0,
  maxHighVulns: 2,
};

function checkAuditPolicy(
  auditSummary: AuditSummary | undefined,
  policy: PolicyConfig,
  violations: string[]
): void {
  if (!auditSummary) { return; }
  if (auditSummary.severityCounts.critical > policy.maxCriticalVulns) {
    violations.push(
      `Critical vulnerabilities (${auditSummary.severityCounts.critical}) exceed policy threshold (${policy.maxCriticalVulns}).`
    );
  }
  if (auditSummary.severityCounts.high > policy.maxHighVulns) {
    violations.push(
      `High vulnerabilities (${auditSummary.severityCounts.high}) exceed policy threshold (${policy.maxHighVulns}).`
    );
  }
}


function checkPackageLicense(
  pkgName: string,
  pkgLicense: string,
  policy: PolicyConfig,
  violations: string[],
  checkedLicenses: Array<{ name: string; license: string }>
): void {
  checkedLicenses.push({ name: pkgName, license: pkgLicense });
  if (policy.blockedLicenses.includes(pkgLicense)) {
    violations.push(`Package ${pkgName} uses blocked license ${pkgLicense}.`);
  }
}


async function checkLicenses(
  licenseReportPath: string | undefined,
  policy: PolicyConfig,
  violations: string[],
  checkedLicenses: Array<{ name: string; license: string }>
): Promise<void> {
  if (licenseReportPath && existsSync(licenseReportPath)) {
    const report = await readJson<Array<{ name: string; license: string }>>(licenseReportPath);
    for (const entry of report) {
      checkedLicenses.push(entry);
      if (policy.blockedLicenses.includes(entry.license)) {
        violations.push(`Package ${entry.name} uses blocked license ${entry.license}.`);
      }
      if (!policy.allowedLicenses.includes(entry.license)) {
        violations.push(`Package ${entry.name} uses license ${entry.license} not in allowlist.`);
      }
    }
  } else {
    // Try to build a minimal view from package.json files
    const packageFiles = await findFiles(process.cwd(), /package\.json$/);
    for (const file of packageFiles) {
      try {
        const package_ = await readJson<{ name?: string; license?: string }>(file);
        if (package_.name && package_.license) {
          checkPackageLicense(package_.name, package_.license, policy, violations, checkedLicenses);
        }
      } catch {
        continue;
      }
    }
  }
}


export async function checkPolicyCompliance(
  options: PolicyCheckOptions = {}
): Promise<PolicyCheckResult> {
  const { policyFile, licenseReportPath, auditSummary, fallbackPolicy } = options;

  let policy = defaultPolicy;
  if (policyFile && existsSync(policyFile)) {
    const fileConfig = await readJson<PolicyConfig>(policyFile);
    policy = { ...policy, ...fileConfig };
  } else if (fallbackPolicy) {
    policy = { ...policy, ...fallbackPolicy };
  }

  const violations: string[] = [];
  checkAuditPolicy(auditSummary, policy, violations);

  const checkedLicenses: Array<{ name: string; license: string }> = [];
  await checkLicenses(licenseReportPath, policy, violations, checkedLicenses);

  const passed = violations.length === 0;
  if (passed) {
    log('success', 'Policy compliance check passed.');
  } else {
    log('error', `Policy compliance failed:\n- ${violations.join('\n- ')}`);
  }

  return { passed, violations, checkedLicenses };
}


export * from './env-coverage.js';
export * from './license-check.js';
export * from './precommit-secrets.js';
export * from './rotate.js';
export * from './sbom.js';
export * from './sign.js';
