import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { exec, log } from '../utils/index.js';

export type RotationProvider = 'aws' | 'gcp' | 'vault' | string;

export interface RotationRequest {
  secretId: string;
  version?: string;
  metadata?: Record<string, unknown>;
}

export interface RotationResult {
  provider: RotationProvider;
  secretId: string;
  success: boolean;
  rawOutput?: string;
  errorOutput?: string;
}

export type RotationHook = (context: RotationRequest) => Promise<void> | void;

export interface RotationAdapter {
  name: RotationProvider;
  rotate: (request: RotationRequest) => Promise<RotationResult>;
}

export interface RotationOptions extends RotationRequest {
  adapter: RotationAdapter;
  before?: RotationHook[];
  after?: RotationHook[];
}

export async function rotateSecret(options: RotationOptions): Promise<RotationResult> {
  const { adapter, before = [], after = [], ...request } = options;

  for (const hook of before) {
    await hook(request);
  }

  const result = await adapter.rotate(request);

  for (const hook of after) {
    await hook(request);
  }

  if (!result.success) {
    throw new Error(`Rotation failed for ${result.secretId} via ${result.provider}`);
  }

  log('success', `Rotated ${result.secretId} using ${result.provider}`);
  return result;
}

async function writeTempPayload(payload: unknown): Promise<string> {
  const tempPath = path.join(os.tmpdir(), `kitium-rotation-${Date.now()}`);
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload ?? '');
  await fs.writeFile(tempPath, body, 'utf-8');
  return tempPath;
}

export function createAwsSecretsManagerAdapter(region?: string): RotationAdapter {
  return {
    name: 'aws',
    async rotate({ secretId, version, metadata }: RotationRequest) {
      const args = ['secretsmanager', 'rotate-secret', '--secret-id', secretId];
      if (version) {
        args.push('--version-id', version);
      }
      if (region) {
        args.push('--region', region);
      }
      if (metadata) {
        args.push('--cli-input-json', JSON.stringify({ ClientRequestToken: metadata }));
      }

      const result = await exec('aws', args, { throwOnError: false });
      return {
        provider: 'aws',
        secretId,
        success: result.code === 0,
        rawOutput: result.stdout,
        errorOutput: result.stderr,
      };
    },
  };
}

export function createGcpSecretManagerAdapter(projectId?: string): RotationAdapter {
  return {
    name: 'gcp',
    async rotate({ secretId, metadata }: RotationRequest) {
      const args = ['secrets', 'versions', 'add', secretId];
      if (projectId) {
        args.push('--project', projectId);
      }
      let tempPath: string | undefined;
      try {
        if (metadata && 'payload' in metadata) {
          tempPath = await writeTempPayload((metadata as { payload: unknown }).payload);
        }
        args.push('--data-file', tempPath ?? '/dev/null');
        const result = await exec('gcloud', args, { throwOnError: false });
        return {
          provider: 'gcp',
          secretId,
          success: result.code === 0,
          rawOutput: result.stdout,
          errorOutput: result.stderr,
        };
      } finally {
        if (tempPath) {
          await fs.rm(tempPath, { force: true });
        }
      }
    },
  };
}

export function createVaultAdapter(mountPath = 'secret'): RotationAdapter {
  return {
    name: 'vault',
    async rotate({ secretId, metadata }: RotationRequest) {
      const payload = metadata ?? {};
      const args = [
        'kv',
        'put',
        `${mountPath}/${secretId}`,
        ...Object.entries(payload).flatMap(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`),
      ];
      const result = await exec('vault', args, { throwOnError: false });
      return {
        provider: 'vault',
        secretId,
        success: result.code === 0,
        rawOutput: result.stdout,
        errorOutput: result.stderr,
      };
    },
  };
}
