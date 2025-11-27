import { log } from '../utils/index.js';

export interface LaunchDarklyEnvironmentConfig {
  on: boolean;
  rules?: unknown[];
  targets?: unknown[];
  fallthrough?: { variation?: number };
}

export interface LaunchDarklyFlagConfig {
  key: string;
  description?: string;
  archived?: boolean;
  tags?: string[];
  variations?: unknown[];
  fallthrough?: { variation?: number };
  environments?: Record<string, LaunchDarklyEnvironmentConfig>;
}

export interface LaunchDarklyProjectConfig {
  project?: string;
  flags: LaunchDarklyFlagConfig[];
}

export interface ConfigCatFlagConfig {
  key?: string;
  description?: string;
  defaultValue: unknown;
  targetingRules?: unknown[];
  percentageRules?: unknown[];
  tags?: string[];
  archived?: boolean;
  isArchived?: boolean;
}

export interface ConfigCatProjectConfig {
  projectId?: string;
  flags: Record<string, ConfigCatFlagConfig>;
}

export interface FlagLintOptions {
  launchDarkly?: LaunchDarklyProjectConfig;
  configCat?: ConfigCatProjectConfig;
  referencedFlags?: string[];
  requiredTags?: string[];
  requireDescriptions?: boolean;
}

export interface FlagLintResult {
  valid: boolean;
  issues: string[];
  deadFlags: string[];
  totalFlags: number;
}

function collectIssuesForLaunchDarkly(
  config: LaunchDarklyProjectConfig,
  options: FlagLintOptions,
  issues: string[],
  deadFlags: Set<string>
): void {
  for (const flag of config.flags) {
    const key = flag.key;
    if (!key) {
      issues.push('LaunchDarkly flag missing key');
      continue;
    }

    if (options.requireDescriptions !== false && !flag.description) {
      issues.push(`Flag ${key} is missing a description`);
    }

    if (options.requiredTags && options.requiredTags.length > 0) {
      const missingTags = options.requiredTags.filter((tag) => !(flag.tags || []).includes(tag));
      if (missingTags.length > 0) {
        issues.push(`Flag ${key} is missing required tags: ${missingTags.join(', ')}`);
      }
    }

    if (!flag.variations || flag.variations.length < 2) {
      issues.push(`Flag ${key} should define at least two variations`);
    }

    const envs = flag.environments ? Object.entries(flag.environments) : [];
    for (const [envName, env] of envs) {
      if (env.on && !env.rules?.length && !env.targets?.length) {
        issues.push(`Flag ${key} environment ${envName} is permanently on without targeting rules`);
      }
      if (env.on && env.fallthrough?.variation === undefined && flag.fallthrough?.variation === undefined) {
        issues.push(`Flag ${key} environment ${envName} is missing a fallthrough variation`);
      }
    }

    const referenced = options.referencedFlags?.includes(key);
    const archived = flag.archived === true;
    const inactiveEverywhere = envs.length > 0 && envs.every(([, env]) => !env.on);
    if (archived || inactiveEverywhere || referenced === false) {
      deadFlags.add(key);
    }
  }
}

function collectIssuesForConfigCat(
  config: ConfigCatProjectConfig,
  options: FlagLintOptions,
  issues: string[],
  deadFlags: Set<string>
): void {
  for (const [keyFromRecord, flagConfig] of Object.entries(config.flags)) {
    const key = flagConfig.key || keyFromRecord;
    if (!key) {
      issues.push('ConfigCat flag missing key');
      continue;
    }

    if (options.requireDescriptions !== false && !flagConfig.description) {
      issues.push(`Flag ${key} is missing a description`);
    }

    if (options.requiredTags && options.requiredTags.length > 0) {
      const missingTags = options.requiredTags.filter((tag) => !(flagConfig.tags || []).includes(tag));
      if (missingTags.length > 0) {
        issues.push(`Flag ${key} is missing required tags: ${missingTags.join(', ')}`);
      }
    }

    if (flagConfig.defaultValue === undefined) {
      issues.push(`Flag ${key} must define a defaultValue`);
    }

    if (!flagConfig.targetingRules?.length && !flagConfig.percentageRules?.length) {
      issues.push(`Flag ${key} has no targeting or percentage rules defined`);
    }

    const referenced = options.referencedFlags?.includes(key);
    const archived = flagConfig.archived === true || flagConfig.isArchived === true;
    if (archived || referenced === false) {
      deadFlags.add(key);
    }
  }
}

export function lintFlags(options: FlagLintOptions): FlagLintResult {
  const issues: string[] = [];
  const deadFlags = new Set<string>();
  let totalFlags = 0;

  if (!options.launchDarkly && !options.configCat) {
    throw new Error('Provide either launchDarkly or configCat configuration');
  }

  if (options.launchDarkly) {
    collectIssuesForLaunchDarkly(options.launchDarkly, options, issues, deadFlags);
    totalFlags += options.launchDarkly.flags.length;
  }

  if (options.configCat) {
    collectIssuesForConfigCat(options.configCat, options, issues, deadFlags);
    totalFlags += Object.keys(options.configCat.flags).length;
  }

  const result: FlagLintResult = {
    valid: issues.length === 0,
    issues,
    deadFlags: Array.from(deadFlags).sort(),
    totalFlags,
  };

  if (!result.valid) {
    log('warn', `Flag linting found ${issues.length} issue(s)`);
  }

  if (result.deadFlags.length > 0) {
    log('warn', `Detected ${result.deadFlags.length} potential dead flag(s)`);
  }

  if (result.valid && result.deadFlags.length === 0) {
    log('success', 'Feature flag configuration looks healthy');
  }

  return result;
}
