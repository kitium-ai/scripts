import { existsSync } from 'fs';
import path from 'path';
import { exec, findFiles, log, readJson } from '../utils/index.js';
import { findPackageJson, getPackageManager } from '../deps/index.js';

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

export async function scanSecrets(options: SecretScanOptions = {}): Promise<SecretScanResult> {
  const {
    scanner = 'gitleaks',
    source = process.cwd(),
    configPath,
    cwd = process.cwd(),
    failOnFinding = true,
    extraArgs = [],
  } = options;

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
  args.push(...extraArgs);

  const baseCommand = scanner === 'gitleaks' ? 'gitleaks' : 'trufflehog';
  let result = await exec(baseCommand, args, { cwd, throwOnError: false });

  const missingBinary =
    result.code === 127 ||
    /not recognized|command not found|ENOENT|could not find/i.test(result.stderr);

  if (missingBinary) {
    const pkg = scanner === 'gitleaks' ? 'gitleaks@latest' : 'trufflehog@latest';
    result = await exec('npx', ['--yes', pkg, ...args], { cwd, throwOnError: false });
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

export async function auditDependencies(options: AuditOptions = {}): Promise<AuditSummary> {
  const { packagePath = process.cwd(), severityThreshold = 'low', includeDev = false, cwd } = options;
  const packageJsonPath = findPackageJson(packagePath);
  if (!packageJsonPath) {
    throw new Error(`Could not locate package.json near ${packagePath}`);
  }

  const manager = getPackageManager(packageJsonPath);
  const auditArgs =
    manager === 'pnpm'
      ? ['audit', '--json', includeDev ? '--dev' : '--prod']
      : ['audit', '--json', includeDev ? '--dev' : '--production'];
  const auditResult = await exec(manager, auditArgs, {
    cwd: cwd ?? path.dirname(packageJsonPath),
    throwOnError: false,
  });

  const raw = pickJsonObject(auditResult.stdout) as {
    advisories?: Record<
      string,
      {
        module_name: string;
        severity: Severity;
        title?: string;
        url?: string;
        findings?: Array<{ paths: string[]; dev?: boolean; optional?: boolean }>;
        vulnerable_versions?: string;
      }
    >;
    vulnerabilities?: Record<
      string,
      {
        severity: Severity;
        fixAvailable?: boolean;
        via?: Array<
          | string
          | {
              title?: string;
              url?: string;
              severity?: Severity;
              range?: string;
            }
        >;
      }
    >;
    metadata?: {
      vulnerabilities?: Record<Severity, number>;
    };
  };

  const severityCounts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    info: 0,
  };

  const advisories: AuditAdvisory[] = [];

  if (raw?.advisories) {
    for (const advisory of Object.values(raw.advisories)) {
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
  } else if (raw?.vulnerabilities) {
    for (const [module, vuln] of Object.entries(raw.vulnerabilities)) {
      const severity = vuln.severity ?? 'info';
      if (!isSeverityAllowed(severity, severityThreshold)) {
        continue;
      }
      advisories.push({
        module,
        severity,
        title: typeof vuln.via?.[0] === 'object' ? vuln.via[0].title : undefined,
        url: typeof vuln.via?.[0] === 'object' ? vuln.via[0].url : undefined,
        range: typeof vuln.via?.[0] === 'object' ? vuln.via[0].range : undefined,
      });
      severityCounts[severity] += 1;
    }
  } else if (raw?.metadata?.vulnerabilities) {
    for (const level of Object.keys(raw.metadata.vulnerabilities) as Severity[]) {
      if (!isSeverityAllowed(level, severityThreshold)) {
        continue;
      }
      severityCounts[level] += raw.metadata.vulnerabilities[level] ?? 0;
    }
  }

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

  if (auditSummary) {
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

  const checkedLicenses: Array<{ name: string; license: string }> = [];
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
        const pkg = await readJson<{ name?: string; license?: string }>(file);
        if (pkg.name && pkg.license) {
          checkedLicenses.push({ name: pkg.name, license: pkg.license });
          if (policy.blockedLicenses.includes(pkg.license)) {
            violations.push(`Package ${pkg.name} uses blocked license ${pkg.license}.`);
          }
        }
      } catch {
        continue;
      }
    }
  }

  const passed = violations.length === 0;
  if (passed) {
    log('success', 'Policy compliance check passed.');
  } else {
    log('error', `Policy compliance failed:\n- ${violations.join('\n- ')}`);
  }

  return { passed, violations, checkedLicenses };
}

export * from './sbom.js';
export * from './sign.js';
export * from './license-check.js';

