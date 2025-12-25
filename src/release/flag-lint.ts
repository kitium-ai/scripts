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


function checkLDDescriptions(flag: LaunchDarklyFlagConfig, key: string, requireDescriptions: boolean | undefined, issues: string[]): void {
  if (requireDescriptions !== false && !flag.description) {
    issues.push(`Flag ${key} is missing a description`);
  }
}

function checkLDTags(flag: LaunchDarklyFlagConfig, key: string, requiredTags: string[] | undefined, issues: string[]): void {
  if (requiredTags && requiredTags.length > 0) {
    const missingTags = requiredTags.filter((tag) => !(flag.tags || []).includes(tag));
    if (missingTags.length > 0) {
      issues.push(`Flag ${key} is missing required tags: ${missingTags.join(', ')}`);
    }
  }
}

function checkLDEnvironments(flag: LaunchDarklyFlagConfig, key: string, issues: string[]): void {
  const environments = flag.environments ? Object.entries(flag.environments) : [];
  for (const [environmentName, environment] of environments) {
    if (environment.on && !environment.rules?.length && !environment.targets?.length) {
      issues.push(`Flag ${key} environment ${environmentName} is permanently on without targeting rules`);
    }
    if (environment.on && environment.fallthrough?.variation === undefined && flag.fallthrough?.variation === undefined) {
      issues.push(`Flag ${key} environment ${environmentName} is missing a fallthrough variation`);
    }
  }
}

function checkLDDeadness(flag: LaunchDarklyFlagConfig, key: string, referencedFlags: string[] | undefined, deadFlags: Set<string>): void {
  const referenced = referencedFlags?.includes(key);
  const archived = flag.archived === true;
  const environments = flag.environments ? Object.entries(flag.environments) : [];
  const inactiveEverywhere = environments.length > 0 && environments.every(([, environment]) => !environment.on);
  if (archived || inactiveEverywhere || referenced === false) {
    deadFlags.add(key);
  }
}

function lintLaunchDarklyFlag(
  flag: LaunchDarklyFlagConfig,
  options: FlagLintOptions,
  issues: string[],
  deadFlags: Set<string>
): void {
  const key = flag.key;
  if (!key) {
    issues.push('LaunchDarkly flag missing key');
    return;
  }

  checkLDDescriptions(flag, key, options.requireDescriptions, issues);
  checkLDTags(flag, key, options.requiredTags, issues);

  if (!flag.variations || flag.variations.length < 2) {
    issues.push(`Flag ${key} should define at least two variations`);
  }

  checkLDEnvironments(flag, key, issues);
  checkLDDeadness(flag, key, options.referencedFlags, deadFlags);
}

function collectIssuesForLaunchDarkly(
  config: LaunchDarklyProjectConfig,
  options: FlagLintOptions,
  issues: string[],
  deadFlags: Set<string>
): void {
  for (const flag of config.flags) {
    lintLaunchDarklyFlag(flag, options, issues, deadFlags);
  }
}

function checkCCBasic(flagConfig: ConfigCatFlagConfig, key: string, options: FlagLintOptions, issues: string[]): void {
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
}


function lintConfigCatFlag(
  keyFromRecord: string,
  flagConfig: ConfigCatFlagConfig,
  options: FlagLintOptions,
  issues: string[],
  deadFlags: Set<string>
): void {
  const key = flagConfig.key || keyFromRecord;
  if (!key) {
    issues.push('ConfigCat flag missing key');
    return;
  }

  checkCCBasic(flagConfig, key, options, issues);

  if (!flagConfig.targetingRules?.length && !flagConfig.percentageRules?.length) {
    issues.push(`Flag ${key} has no targeting or percentage rules defined`);
  }

  const referenced = options.referencedFlags?.includes(key);
  const archived = flagConfig.archived === true || flagConfig.isArchived === true;
  if (archived || referenced === false) {
    deadFlags.add(key);
  }
}

function collectIssuesForConfigCat(
  config: ConfigCatProjectConfig,
  options: FlagLintOptions,
  issues: string[],
  deadFlags: Set<string>
): void {
  for (const [keyFromRecord, flagConfig] of Object.entries(config.flags)) {
    lintConfigCatFlag(keyFromRecord, flagConfig, options, issues, deadFlags);
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
