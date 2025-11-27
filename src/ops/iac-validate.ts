import path from 'path';
import { exec, log } from '../utils/index.js';

export interface PolicyPackConfig {
  engine: 'conftest' | 'opa';
  policies: string[];
  targets: string[];
  query?: string;
  args?: string[];
}

export interface IaCValidateOptions {
  terraformDirs?: string[];
  terragruntDirs?: string[];
  cloudformationTemplates?: string[];
  policyPacks?: PolicyPackConfig[];
  cwd?: string;
  failFast?: boolean;
}

export interface ToolResult {
  target: string;
  tool: string;
  ok: boolean;
  stdout: string;
  stderr: string;
}

export interface IaCValidationReport {
  terraform: ToolResult[];
  terragrunt: ToolResult[];
  cloudformation: ToolResult[];
  policyPacks: ToolResult[];
}

async function runCommandWithFallback(
  tool: string,
  args: string[],
  cwd: string | undefined,
  fallbackNpxPackage?: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  let result = await exec(tool, args, { cwd, throwOnError: false });
  const missingBinary =
    result.code === 127 || /not recognized|command not found|ENOENT/i.test(result.stderr);

  if (missingBinary && fallbackNpxPackage) {
    result = await exec('npx', ['--yes', fallbackNpxPackage, ...args], { cwd, throwOnError: false });
  }

  return result;
}

async function validateTerraform(target: string): Promise<ToolResult> {
  const init = await runCommandWithFallback(
    'terraform',
    ['init', '-input=false', '-backend=false', '-no-color'],
    target,
  );
  if (init.code !== 0) {
    log('warn', `terraform init failed in ${target}: ${init.stderr || init.stdout}`);
  }
  const result = await runCommandWithFallback('terraform', ['validate', '-no-color'], target);
  const ok = result.code === 0;
  if (ok) {
    log('success', `Terraform validation passed for ${target}.`);
  } else {
    log('error', `Terraform validation failed for ${target}: ${result.stderr || result.stdout}`);
  }
  return { target, tool: 'terraform', ok, stdout: result.stdout, stderr: result.stderr };
}

async function validateTerragrunt(target: string): Promise<ToolResult> {
  const result = await runCommandWithFallback(
    'terragrunt',
    ['validate', '--terragrunt-non-interactive'],
    target,
  );
  const ok = result.code === 0;
  if (ok) {
    log('success', `Terragrunt validation passed for ${target}.`);
  } else {
    log('error', `Terragrunt validation failed for ${target}: ${result.stderr || result.stdout}`);
  }
  return { target, tool: 'terragrunt', ok, stdout: result.stdout, stderr: result.stderr };
}

async function validateCloudFormation(template: string, cwd: string | undefined): Promise<ToolResult> {
  const absoluteTemplate = path.isAbsolute(template) ? template : path.join(cwd ?? process.cwd(), template);
  const args = ['validate-template', '--template-body', `file://${absoluteTemplate}`];
  const result = await runCommandWithFallback('aws', ['cloudformation', ...args], cwd, 'aws-cli');
  const ok = result.code === 0;
  if (ok) {
    log('success', `CloudFormation template is valid: ${template}.`);
  } else {
    log('error', `CloudFormation validation failed for ${template}: ${result.stderr || result.stdout}`);
  }
  return { target: template, tool: 'cloudformation', ok, stdout: result.stdout, stderr: result.stderr };
}

async function validatePolicyPack(pack: PolicyPackConfig, cwd: string | undefined): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  for (const target of pack.targets) {
    const args: string[] = [];
    if (pack.engine === 'conftest') {
      args.push('test', target);
      for (const policy of pack.policies) {
        args.push('-p', policy);
      }
      if (pack.args) {
        args.push(...pack.args);
      }
    } else {
      // OPA eval
      args.push('eval', '--fail-defined');
      for (const policy of pack.policies) {
        args.push('--data', policy);
      }
      const query = pack.query ?? 'data.main.deny == []';
      args.push('--input', target, query);
      if (pack.args) {
        args.push(...pack.args);
      }
    }
    const result = await runCommandWithFallback(
      pack.engine,
      args,
      cwd,
      pack.engine === 'conftest' ? 'conftest' : 'opa',
    );
    const ok = result.code === 0;
    if (ok) {
      log('success', `${pack.engine} policy check passed for ${target}.`);
    } else {
      log('error', `${pack.engine} policy check failed for ${target}: ${result.stderr || result.stdout}`);
    }
    results.push({ target, tool: pack.engine, ok, stdout: result.stdout, stderr: result.stderr });
  }
  return results;
}

export async function validateInfrastructure(
  options: IaCValidateOptions,
): Promise<IaCValidationReport> {
  const terraformTargets = options.terraformDirs ?? [];
  const terragruntTargets = options.terragruntDirs ?? [];
  const cloudformationTargets = options.cloudformationTemplates ?? [];
  const policyPacks = options.policyPacks ?? [];

  const terraformResults: ToolResult[] = [];
  for (const dir of terraformTargets) {
    const workDir = options.cwd ? path.join(options.cwd, dir) : dir;
    const result = await validateTerraform(workDir);
    terraformResults.push(result);
    if (options.failFast && !result.ok) break;
  }

  const terragruntResults: ToolResult[] = [];
  for (const dir of terragruntTargets) {
    const workDir = options.cwd ? path.join(options.cwd, dir) : dir;
    const result = await validateTerragrunt(workDir);
    terragruntResults.push(result);
    if (options.failFast && !result.ok) break;
  }

  const cloudformationResults: ToolResult[] = [];
  for (const template of cloudformationTargets) {
    const result = await validateCloudFormation(template, options.cwd);
    cloudformationResults.push(result);
    if (options.failFast && !result.ok) break;
  }

  const policyResults: ToolResult[] = [];
  for (const pack of policyPacks) {
    const packResults = await validatePolicyPack(pack, options.cwd);
    policyResults.push(...packResults);
    if (options.failFast && packResults.some((r) => !r.ok)) break;
  }

  return {
    terraform: terraformResults,
    terragrunt: terragruntResults,
    cloudformation: cloudformationResults,
    policyPacks: policyResults,
  };
}
