import { promises as fs } from 'fs';
import path from 'path';
import { findFiles, getRelativePath, log } from '../utils/index.js';

export type PiiSeverity = 'low' | 'medium' | 'high';

export interface PiiRule {
  id: string;
  description: string;
  regex: RegExp;
  severity?: PiiSeverity;
  recommendation?: string;
}

export interface PiiFinding {
  file: string;
  line: number;
  column: number;
  match: string;
  ruleId: string;
  severity: PiiSeverity;
  recommendation?: string;
}

export interface PiiScanOptions {
  /** Directories to scan. Defaults to current working directory. */
  roots?: string[];
  /** File extensions to include (e.g. ['.ts', '.json']). Defaults to common source/data files. */
  includeExtensions?: string[];
  /** Regex patterns for paths to exclude (e.g. /node_modules/). */
  excludePaths?: RegExp[];
  /** Custom rule overrides. Defaults will be merged with provided rules. */
  rules?: PiiRule[];
  /** Maximum file size in kilobytes to scan to avoid massive datasets. */
  maxFileSizeKb?: number;
  /** Throw an error if any PII is found. */
  failOnFinding?: boolean;
}

export interface PiiScanResult {
  findings: PiiFinding[];
  scannedFiles: number;
}

const defaultRules: PiiRule[] = [
  {
    id: 'email',
    description: 'Email addresses',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    severity: 'medium',
    recommendation: 'Remove or redact email addresses before committing.',
  },
  {
    id: 'phone',
    description: 'Phone numbers',
    regex: /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g,
    severity: 'medium',
    recommendation: 'Redact or tokenize phone numbers.',
  },
  {
    id: 'ssn',
    description: 'US Social Security Number',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    severity: 'high',
    recommendation: 'Remove SSNs from datasets or replace with synthetic values.',
  },
  {
    id: 'credit_card',
    description: 'Credit card numbers (Luhn-like patterns)',
    regex: /\b(?:\d[ -]*?){13,16}\b/g,
    severity: 'high',
    recommendation: 'Do not store raw payment card data. Use a PCI-compliant vault.',
  },
  {
    id: 'api_key',
    description: 'Generic API keys and tokens',
    regex: /(?:(?:sk|rk|pk)_)?[A-Za-z0-9]{16,}/g,
    severity: 'high',
    recommendation: 'Store secrets in a vault and inject via environment variables.',
  },
  {
    id: 'ipv4',
    description: 'IPv4 addresses',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    severity: 'low',
    recommendation: 'Mask IP addresses unless needed for troubleshooting.',
  },
];

function ensureGlobalRegex(regex: RegExp): RegExp {
  if (regex.flags.includes('g')) {
    return regex;
  }
  return new RegExp(regex.source, `${regex.flags}g`);
}

function mergeRules(customRules?: PiiRule[]): PiiRule[] {
  if (!customRules || customRules.length === 0) {
    return defaultRules;
  }

  const ruleMap = new Map<string, PiiRule>();
  for (const rule of defaultRules) {
    ruleMap.set(rule.id, rule);
  }

  for (const rule of customRules) {
    ruleMap.set(rule.id, rule);
  }

  return Array.from(ruleMap.values());
}

function shouldIncludeFile(filePath: string, includeExtensions: string[], excludePaths: RegExp[]): boolean {
  if (excludePaths.some((pattern) => pattern.test(filePath))) {
    return false;
  }

  const extension = path.extname(filePath).toLowerCase();
  return includeExtensions.length === 0 || includeExtensions.includes(extension);
}

async function readFileSafe(filePath: string, maxFileSizeKb: number): Promise<string | null> {
  const stats = await fs.stat(filePath);
  const sizeKb = stats.size / 1024;

  if (sizeKb > maxFileSizeKb) {
    log('warn', `Skipping ${getRelativePath(filePath)} - file size ${sizeKb.toFixed(1)}KB exceeds limit ${maxFileSizeKb}KB.`);
    return null;
  }

  return fs.readFile(filePath, 'utf-8');
}

function scanContent(content: string, relativePath: string, rules: PiiRule[]): PiiFinding[] {
  const findings: PiiFinding[] = [];
  const lines = content.split(/\r?\n/);

  for (const rule of rules) {
    const regex = ensureGlobalRegex(rule.regex);
    lines.forEach((line, index) => {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        findings.push({
          file: relativePath,
          line: index + 1,
          column: match.index + 1,
          match: match[0],
          ruleId: rule.id,
          severity: rule.severity || 'medium',
          recommendation: rule.recommendation,
        });
      }
    });
  }

  return findings;
}

export async function scanPii(options: PiiScanOptions = {}): Promise<PiiScanResult> {
  const {
    roots = [process.cwd()],
    includeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml', '.csv', '.txt'],
    excludePaths = [/node_modules/, /.git\//, /dist\//, /build\//],
    rules: customRules,
    maxFileSizeKb = 512,
    failOnFinding = false,
  } = options;

  const rules = mergeRules(customRules);
  const findings: PiiFinding[] = [];
  let scannedFiles = 0;

  for (const root of roots) {
    const files = await findFiles(root, /.*/);
    for (const filePath of files) {
      if (!shouldIncludeFile(filePath, includeExtensions, excludePaths)) {
        continue;
      }

      const content = await readFileSafe(filePath, maxFileSizeKb);
      if (!content) {
        continue;
      }

      scannedFiles += 1;
      const relativePath = getRelativePath(filePath);
      findings.push(...scanContent(content, relativePath, rules));
    }
  }

  if (findings.length === 0) {
    log('success', `PII scan completed. No issues found across ${scannedFiles} files.`);
  } else {
    const summary = findings.reduce<Record<PiiSeverity, number>>(
      (acc, finding) => {
        acc[finding.severity] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0 },
    );

    log('warn', `PII scan found ${findings.length} potential issue(s): ${JSON.stringify(summary)}.`);
    if (failOnFinding) {
      throw new Error('PII scan detected findings. Review results before proceeding.');
    }
  }

  return { findings, scannedFiles };
}
