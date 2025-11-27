import { promises as fs } from 'fs';
import path from 'path';
import { log, pathExists, writeJson } from '../utils/index.js';

export interface EnvVariableDescriptor {
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

export interface EnvManifest {
  env?: EnvVariableDescriptor[];
  composeFiles?: ComposeFileDefinition[];
  portMap?: PortMapEntry[];
}

export interface EnvBootstrapOptions {
  manifestPath: string;
  outputDir?: string;
  composeDir?: string;
  portMapPath?: string;
  overwrite?: boolean;
}

export interface EnvBootstrapResult {
  envExamplePath?: string;
  composePaths: string[];
  portMapPath?: string;
  missing?: string[];
}

async function loadManifest(manifestPath: string): Promise<EnvManifest> {
  const content = await fs.readFile(manifestPath, 'utf-8');
  try {
    return JSON.parse(content) as EnvManifest;
  } catch (error) {
    throw new Error(`Failed to parse manifest at ${manifestPath}: ${error}`);
  }
}

function renderEnvExample(vars: EnvVariableDescriptor[]): string {
  const lines: string[] = [];
  for (const variable of vars) {
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

function renderComposeFile(definition: ComposeFileDefinition): string {
  const lines: string[] = [];
  lines.push(`version: '${definition.version ?? '3.9'}'`);
  lines.push('services:');

  for (const service of definition.services) {
    lines.push(`  ${service.name}:`);
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
    if (service.environment && Object.keys(service.environment).length > 0) {
      lines.push('    environment:');
      for (const [key, value] of Object.entries(service.environment)) {
        lines.push(`      ${key}: ${value}`);
      }
    }
    if (service.dependsOn && service.dependsOn.length > 0) {
      lines.push('    depends_on:');
      for (const dependency of service.dependsOn) {
        lines.push(`      - ${dependency}`);
      }
    }
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
  if (!files) return [];
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

export async function bootstrapEnvFromManifest(
  options: EnvBootstrapOptions,
): Promise<EnvBootstrapResult> {
  const manifest = await loadManifest(options.manifestPath);
  const baseDir = options.outputDir ?? path.dirname(options.manifestPath);
  const composeDir = options.composeDir ?? baseDir;
  const portMapPath = options.portMapPath ?? path.join(baseDir, 'ports.map.json');
  const missing: string[] = [];
  const composePaths: string[] = [];

  if (!manifest.env || manifest.env.length === 0) {
    missing.push('env');
  } else {
    const envPath = path.join(baseDir, '.env.example');
    if (!options.overwrite && (await pathExists(envPath))) {
      log('warn', `.env.example already exists at ${envPath}; skipping scaffold.`);
    } else {
      await fs.writeFile(envPath, renderEnvExample(manifest.env), 'utf-8');
      log('success', `Wrote ${envPath} from manifest.`);
    }
  }

  if (!manifest.composeFiles || manifest.composeFiles.length === 0) {
    missing.push('composeFiles');
  } else {
    for (const file of manifest.composeFiles) {
      const filename = file.filename ?? 'docker-compose.yml';
      const target = path.join(composeDir, filename);
      if (!options.overwrite && (await pathExists(target))) {
        log('warn', `${filename} already exists at ${target}; skipping scaffold.`);
      } else {
        await fs.writeFile(target, renderComposeFile(file), 'utf-8');
        log('success', `Wrote ${target} from manifest.`);
      }
      composePaths.push(target);
    }
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
    envExamplePath: manifest.env && manifest.env.length > 0 ? path.join(baseDir, '.env.example') : undefined,
    composePaths,
    portMapPath: mergedPorts.length > 0 ? portMapPath : undefined,
    missing: missing.length > 0 ? missing : undefined,
  };
}
