import path from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { exec, log } from '../utils/index.js';

export type SigningTool = 'cosign' | 'gpg';

export interface SignArtifactOptions {
  artifact: string;
  signaturePath?: string;
  keyPath?: string;
  identityToken?: string;
  annotations?: Record<string, string>;
  tool?: SigningTool;
  cwd?: string;
}

export interface VerifyArtifactOptions {
  artifact: string;
  signaturePath?: string;
  keyPath?: string;
  tool?: SigningTool;
  cwd?: string;
}

function buildSignaturePath(artifact: string, provided?: string): string {
  if (provided) return provided;
  return `${artifact}.sig`;
}

function shouldRetryWithNpx(result: { code: number; stderr: string }): boolean {
  return result.code === 127 || /not found|ENOENT|is not recognized|cosign/i.test(result.stderr);
}

function toAnnotationArgs(annotations: Record<string, string> = {}): string[] {
  return Object.entries(annotations).flatMap(([key, value]) => ['--annotation', `${key}=${value}`]);
}

export async function signArtifact(options: SignArtifactOptions): Promise<string> {
  const {
    artifact,
    keyPath,
    identityToken,
    annotations,
    tool = 'cosign',
    cwd = process.cwd(),
  } = options;

  const signaturePath = path.resolve(cwd, buildSignaturePath(artifact, options.signaturePath));
  await fs.mkdir(path.dirname(signaturePath), { recursive: true });

  let command = '';
  let args: string[] = [];
  let fallback = '';

  if (tool === 'gpg') {
    command = 'gpg';
    args = ['--output', signaturePath, '--detach-sign', artifact];
    if (keyPath) {
      args.push('--default-key', keyPath);
    }
    fallback = 'gpg';
  } else {
    command = 'cosign';
    args = ['sign-blob', artifact, '--output-signature', signaturePath];
    if (keyPath) {
      args.push('--key', keyPath);
    }
    if (identityToken) {
      args.push('--identity-token', identityToken);
    }
    args.push(...toAnnotationArgs(annotations));
    fallback = '@sigstore/cosign';
  }

  let result = await exec(command, args, { cwd, throwOnError: false });
  if (result.code !== 0 && shouldRetryWithNpx(result) && fallback !== 'gpg') {
    const npxArgs = ['--yes', fallback, ...args];
    result = await exec('npx', npxArgs, { cwd, throwOnError: false });
  }

  if (result.code !== 0) {
    throw new Error(`Artifact signing failed: ${result.stderr || result.stdout}`);
  }

  log('success', `Artifact ${artifact} signed using ${tool}. Signature: ${signaturePath}`);
  return signaturePath;
}

export async function verifyArtifact(options: VerifyArtifactOptions): Promise<boolean> {
  const { artifact, keyPath, tool = 'cosign', cwd = process.cwd() } = options;
  const signaturePath = path.resolve(cwd, buildSignaturePath(artifact, options.signaturePath));

  if (!existsSync(signaturePath)) {
    throw new Error(`Signature file not found: ${signaturePath}`);
  }

  let command = '';
  let args: string[] = [];
  let fallback = '';

  if (tool === 'gpg') {
    command = 'gpg';
    args = ['--verify', signaturePath, artifact];
    if (keyPath) {
      args.push('--keyid-format', 'long', '--default-key', keyPath);
    }
    fallback = 'gpg';
  } else {
    command = 'cosign';
    args = ['verify-blob', artifact, '--signature', signaturePath];
    if (keyPath) {
      args.push('--key', keyPath);
    }
    fallback = '@sigstore/cosign';
  }

  let result = await exec(command, args, { cwd, throwOnError: false });
  if (result.code !== 0 && shouldRetryWithNpx(result) && fallback !== 'gpg') {
    const npxArgs = ['--yes', fallback, ...args];
    result = await exec('npx', npxArgs, { cwd, throwOnError: false });
  }

  if (result.code !== 0) {
    log('error', `Verification failed: ${result.stderr || result.stdout}`);
    return false;
  }

  log('success', `Signature verified for ${artifact} using ${tool}.`);
  return true;
}
