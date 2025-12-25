import { promises as fs } from 'node:fs';
import path from 'node:path';

import { log, pathExists, writeJson } from '../utils/index.js';

export interface EnvironmentVariableDescriptor {
  name: string;
  description?: string;
  defaultValue?: string;
  example?: string;
  required?: boolean;
}

export interface PortMapEntry {
  service: string;
  internal: number;
  external?: number;
  protocol?: 'tcp' | 'udp';
  description?: string;
}

export interface ComposeServiceDefinition {
  name: string;
  image?: string;
  buildContext?: string;
  command?: string;
  environment?: Record<string, string>;
  ports?: Array<{ internal: number; external?: number; protocol?: 'tcp' | 'udp'; description?: string }>;
  volumes?: string[];
  dependsOn?: string[];
}

export interface ComposeFileDefinition {
  filename?: string;
  version?: string;
  services: ComposeServiceDefinition[];
}

export interface EnvironmentManifest {
  env?: EnvironmentVariableDescriptor[];
  composeFiles?: ComposeFileDefinition[];
  portMap?: PortMapEntry[];
}

export interface EnvironmentBootstrapOptions {
  manifestPath: string;
  outputDir?: string;
  composeDir?: string;
  portMapPath?: string;
  overwrite?: boolean;
}

export interface EnvironmentBootstrapResult {
  envExamplePath?: string;
  composePaths: string[];
  portMapPath?: string;
  missing?: string[];
}

async function loadManifest(manifestPath: string): Promise<EnvironmentManifest> {
  const content = await fs.readFile(manifestPath, 'utf-8');
  try {
    return JSON.parse(content) as EnvironmentManifest;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse manifest at ${manifestPath}: ${reason}`);
  }
}

function renderEnvironmentExample(variables: EnvironmentVariableDescriptor[]): string {
  const lines: string[] = [];
  for (const variable of variables) {
    if (variable.description) {
      lines.push(`# ${variable.description}`);
    }
    if (variable.required === false) {
      lines.push('# optional');
    }
    const value = variable.example ?? variable.defaultValue ?? '';
    lines.push(`${variable.name}=${value}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}


function renderServiceBasic(service: ComposeServiceDefinition, lines: string[]): void {
  if (service.image) {
    lines.push(`    image: ${service.image}`);
  }
  if (service.buildContext) {
    lines.push('    build:');
    lines.push(`      context: ${service.buildContext}`);
  }
  if (service.command) {
    lines.push(`    command: ${service.command}`);
  }
}

function renderServiceEnv(service: ComposeServiceDefinition, lines: string[]): void {
  if (service.environment && Object.keys(service.environment).length > 0) {
    lines.push('    environment:');
    for (const [key, value] of Object.entries(service.environment)) {
      lines.push(`      ${key}: ${value}`);
    }
  }
}

function renderServiceDeps(service: ComposeServiceDefinition, lines: string[]): void {
  if (service.dependsOn && service.dependsOn.length > 0) {
    lines.push('    depends_on:');
    for (const dependency of service.dependsOn) {
      lines.push(`      - ${dependency}`);
    }
  }
}

function renderServicePortsAndVolumes(service: ComposeServiceDefinition, lines: string[]): void {
  if (service.ports && service.ports.length > 0) {
    lines.push('    ports:');
    for (const port of service.ports) {
      const target = port.internal;
      const host = port.external ?? target;
      const suffix = port.protocol ? `/${port.protocol}` : '';
      lines.push(`      - "${host}:${target}${suffix}"`);
    }
  }
  if (service.volumes && service.volumes.length > 0) {
    lines.push('    volumes:');
    for (const volume of service.volumes) {
      lines.push(`      - ${volume}`);
    }
  }
}

function renderService(service: ComposeServiceDefinition): string[] {
  const lines: string[] = [];
  lines.push(`  ${service.name}:`);
  renderServiceBasic(service, lines);
  renderServiceEnv(service, lines);
  renderServiceDeps(service, lines);
  renderServicePortsAndVolumes(service, lines);
  return lines;
}


function renderComposeFile(definition: ComposeFileDefinition): string {
  const lines: string[] = [];
  lines.push(`version: '${definition.version ?? '3.9'}'`);
  lines.push('services:');

  for (const service of definition.services) {
    lines.push(...renderService(service));
  }

  return lines.join('\n') + '\n';
}

function mergePorts(
  manifestPorts: PortMapEntry[] | undefined,
  composePorts: PortMapEntry[],
): PortMapEntry[] {
  const merged = new Map<string, PortMapEntry>();
  for (const entry of [...composePorts, ...(manifestPorts ?? [])]) {
    const key = `${entry.service}:${entry.internal}`;
    if (!merged.has(key)) {
      merged.set(key, entry);
    }
  }
  return Array.from(merged.values());
}

function collectPortsFromCompose(files: ComposeFileDefinition[] | undefined): PortMapEntry[] {
  if (!files) { return []; }
  const ports: PortMapEntry[] = [];
  for (const file of files) {
    for (const service of file.services) {
      for (const port of service.ports ?? []) {
        ports.push({
          service: service.name,
          internal: port.internal,
          external: port.external,
          protocol: port.protocol,
          description: port.description,
        });
      }
    }
  }
  return ports;
}

async function processEnvironment(manifest: EnvironmentManifest, baseDir: string, options: EnvironmentBootstrapOptions): Promise<boolean> {
  if (!manifest.env || manifest.env.length === 0) { return false; }

  const environmentPath = path.join(baseDir, '.env.example');
  if (!options.overwrite && (await pathExists(environmentPath))) {
    log('warn', `.env.example already exists at ${environmentPath}; skipping scaffold.`);
  } else {
    await fs.writeFile(environmentPath, renderEnvironmentExample(manifest.env), 'utf-8');
    log('success', `Wrote ${environmentPath} from manifest.`);
  }
  return true;
}

async function processComposeFiles(manifest: EnvironmentManifest, composeDir: string, options: EnvironmentBootstrapOptions): Promise<string[]> {
  if (!manifest.composeFiles || manifest.composeFiles.length === 0) { return []; }
  const paths: string[] = [];

  for (const file of manifest.composeFiles) {
    const filename = file.filename ?? 'docker-compose.yml';
    const target = path.join(composeDir, filename);
    if (!options.overwrite && (await pathExists(target))) {
      log('warn', `${filename} already exists at ${target}; skipping scaffold.`);
    } else {
      await fs.writeFile(target, renderComposeFile(file), 'utf-8');
      log('success', `Wrote ${target} from manifest.`);
    }
    paths.push(target);
  }
  return paths;
}

export async function bootstrapEnvFromManifest(
  options: EnvironmentBootstrapOptions,
): Promise<EnvironmentBootstrapResult> {
  const manifest = await loadManifest(options.manifestPath);
  const baseDir = options.outputDir ?? path.dirname(options.manifestPath);
  const composeDir = options.composeDir ?? baseDir;
  const portMapPath = options.portMapPath ?? path.join(baseDir, 'ports.map.json');
  const missing: string[] = [];

  const hasEnv = await processEnvironment(manifest, baseDir, options);
  if (!hasEnv) {
    missing.push('env');
  }

  const composePaths = await processComposeFiles(manifest, composeDir, options);
  if (composePaths.length === 0) {
    missing.push('composeFiles');
  }

  const derivedPorts = collectPortsFromCompose(manifest.composeFiles);
  const mergedPorts = mergePorts(manifest.portMap, derivedPorts);
  if (mergedPorts.length === 0) {
    missing.push('portMap');
  } else if (!options.overwrite && (await pathExists(portMapPath))) {
    log('warn', `Port map already exists at ${portMapPath}; skipping scaffold.`);
  } else {
    await writeJson(portMapPath, { ports: mergedPorts }, true);
    log('success', `Wrote port map to ${portMapPath}.`);
  }

  return {
    envExamplePath: hasEnv ? path.join(baseDir, '.env.example') : undefined,
    composePaths,
    portMapPath: mergedPorts.length > 0 ? portMapPath : undefined,
    missing: missing.length > 0 ? missing : undefined,
  };
}
