import { existsSync } from 'fs';
import { readJson, findFiles, log } from '../utils/index.js';

export interface WorkspaceLicense {
  name: string;
  license?: string;
  path: string;
}

export interface LicensePolicy {
  allowedLicenses: string[];
  blockedLicenses: string[];
  ignorePackages?: string[];
}

export interface LicenseCheckOptions {
  root?: string;
  policyFile?: string;
  allowedLicenses?: string[];
  blockedLicenses?: string[];
  ignorePackages?: string[];
}

export interface LicenseCheckResult {
  passed: boolean;
  violations: string[];
  packages: WorkspaceLicense[];
}

const defaultPolicy: LicensePolicy = {
  allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC'],
  blockedLicenses: ['GPL-3.0', 'AGPL-3.0'],
};

async function loadPolicy(options: LicenseCheckOptions): Promise<LicensePolicy> {
  const basePolicy = { ...defaultPolicy };
  const { policyFile, allowedLicenses, blockedLicenses, ignorePackages } = options;

  if (policyFile && existsSync(policyFile)) {
    const filePolicy = await readJson<Partial<LicensePolicy>>(policyFile);
    if (filePolicy.allowedLicenses) basePolicy.allowedLicenses = filePolicy.allowedLicenses;
    if (filePolicy.blockedLicenses) basePolicy.blockedLicenses = filePolicy.blockedLicenses;
    if (filePolicy.ignorePackages) basePolicy.ignorePackages = filePolicy.ignorePackages;
  }

  if (allowedLicenses) basePolicy.allowedLicenses = allowedLicenses;
  if (blockedLicenses) basePolicy.blockedLicenses = blockedLicenses;
  if (ignorePackages) basePolicy.ignorePackages = ignorePackages;

  return basePolicy;
}

export async function collectWorkspaceLicenses(root = process.cwd()): Promise<WorkspaceLicense[]> {
  const packageFiles = await findFiles(root, /package\.json$/);
  const packages: WorkspaceLicense[] = [];

  for (const file of packageFiles) {
    try {
      const pkg = await readJson<{ name?: string; license?: string }>(file);
      if (pkg.name) {
        packages.push({ name: pkg.name, license: pkg.license, path: file });
      }
    } catch {
      continue;
    }
  }

  return packages;
}

export async function enforceLicensePolicy(options: LicenseCheckOptions = {}): Promise<LicenseCheckResult> {
  const root = options.root ?? process.cwd();
  const policy = await loadPolicy(options);
  const packages = await collectWorkspaceLicenses(root);

  const violations: string[] = [];
  const ignored = new Set((policy.ignorePackages || []).map((pkg) => pkg.toLowerCase()));

  for (const pkg of packages) {
    if (ignored.has(pkg.name.toLowerCase())) {
      continue;
    }
    if (!pkg.license) {
      violations.push(`Package ${pkg.name} is missing a license declaration (${pkg.path}).`);
      continue;
    }
    if (policy.blockedLicenses.includes(pkg.license)) {
      violations.push(`Package ${pkg.name} uses blocked license ${pkg.license}.`);
      continue;
    }
    if (!policy.allowedLicenses.includes(pkg.license)) {
      violations.push(`Package ${pkg.name} uses license ${pkg.license} which is not allowed.`);
    }
  }

  const passed = violations.length === 0;
  if (passed) {
    log('success', 'License policy check passed for all workspaces.');
  } else {
    log('error', `License policy violations detected:\n- ${violations.join('\n- ')}`);
  }

  return { passed, violations, packages };
}
