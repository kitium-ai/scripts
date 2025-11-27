import path from 'path';
import { promises as fs } from 'fs';
import { exec, log } from '../utils/index.js';

export type SbomTool = 'syft' | 'cyclonedx';
export type SbomFormat = 'cyclonedx-json' | 'cyclonedx-xml' | 'spdx-json';

export interface SbomOptions {
  /** Directory or image to analyze */
  target?: string;
  /** Output file path for the SBOM */
  output?: string;
  /** SBOM format */
  format?: SbomFormat;
  /** Scanner to use */
  tool?: SbomTool;
  /** Working directory */
  cwd?: string;
}

interface CommandPlan {
  command: string;
  args: string[];
  fallbackPackage: string;
  outputPath: string;
}

function resolveFormatExtension(format: SbomFormat): string {
  if (format === 'cyclonedx-xml') {
    return 'xml';
  }
  return 'json';
}

function buildPlan(options: Required<Pick<SbomOptions, 'format' | 'tool' | 'target' | 'output'>>): CommandPlan {
  const { format, tool, target, output } = options;
  const resolvedOutput = path.resolve(output);
  const resolvedTarget = path.resolve(target);

  if (tool === 'cyclonedx') {
    return {
      command: 'cdxgen',
      args: ['-o', resolvedOutput, '-t', format, resolvedTarget],
      fallbackPackage: '@cyclonedx/cdxgen',
      outputPath: resolvedOutput,
    };
  }

  return {
    command: 'syft',
    args: ['packages', `dir:${resolvedTarget}`, '-o', format, '--file', resolvedOutput, '--quiet'],
    fallbackPackage: '@anchore/syft',
    outputPath: resolvedOutput,
  };
}

function buildDefaults(options: SbomOptions): Required<Pick<SbomOptions, 'format' | 'tool' | 'target' | 'output'>> {
  const format = options.format ?? 'cyclonedx-json';
  const tool = options.tool ?? 'syft';
  const target = options.target ?? process.cwd();
  const extension = resolveFormatExtension(format);
  const output = options.output ?? path.join(process.cwd(), `sbom-${tool}.${extension}`);
  return { format, tool, target, output };
}

function shouldRetryWithNpx(result: { code: number; stderr: string }): boolean {
  return (
    result.code === 127 ||
    /not found|ENOENT|is not recognized|install syft|install cdxgen/i.test(result.stderr)
  );
}

/**
 * Generate a Software Bill of Materials (SBOM) using Syft or CycloneDX.
 * Falls back to an NPX-installed binary when the command is unavailable.
 */
export async function generateSbom(options: SbomOptions = {}): Promise<string> {
  const defaults = buildDefaults(options);
  const { cwd = process.cwd() } = options;
  const plan = buildPlan(defaults);

  await fs.mkdir(path.dirname(plan.outputPath), { recursive: true });

  let result = await exec(plan.command, plan.args, { cwd, throwOnError: false });

  if (result.code !== 0 && shouldRetryWithNpx(result)) {
    const npxArgs = ['--yes', plan.fallbackPackage, ...plan.args];
    result = await exec('npx', npxArgs, { cwd, throwOnError: false });
  }

  if (result.code !== 0) {
    throw new Error(`SBOM generation failed: ${result.stderr || result.stdout}`);
  }

  log('success', `SBOM generated at ${plan.outputPath} using ${defaults.tool} (${defaults.format}).`);
  return plan.outputPath;
}

export interface SbomValidateOptions {
  /** Path to SBOM file */
  sbomPath: string;
  /** Working directory */
  cwd?: string;
}

/**
 * Basic validation to ensure the SBOM file exists and is parseable JSON/XML.
 * This is a lightweight check before uploading to registries or attestations.
 */
export async function validateSbom(options: SbomValidateOptions): Promise<boolean> {
  const { sbomPath, cwd = process.cwd() } = options;
  const resolvedPath = path.resolve(cwd, sbomPath);

  try {
    const isXml = resolvedPath.endsWith('.xml');
    if (isXml) {
      const result = await exec('xmllint', ['--noout', resolvedPath], { cwd, throwOnError: false });
      if (result.code === 0) {
        log('success', 'SBOM XML validated successfully.');
        return true;
      }
      log('warn', `SBOM XML validation reported: ${result.stderr || result.stdout}`);
      return false;
    }

    // Default to JSON validation
    const result = await exec('node', ['-e', `JSON.parse(require('fs').readFileSync('${resolvedPath}', 'utf8'));`], {
      cwd,
      throwOnError: false,
    });
    if (result.code === 0) {
      log('success', 'SBOM JSON validated successfully.');
      return true;
    }
    log('warn', `SBOM JSON validation reported: ${result.stderr || result.stdout}`);
    return false;
  } catch (error) {
    log('error', `Failed to validate SBOM: ${(error as Error).message}`);
    return false;
  }
}
