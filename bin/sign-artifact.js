#!/usr/bin/env node

import { signArtifact, verifyArtifact } from '../dist/security/index.js';

const args = process.argv.slice(2);
const artifact = args.find((arg) => !arg.startsWith('--'));

if (!artifact) {
  console.error('Usage: sign-artifact <file> [--tool cosign|gpg] [--key <path>] [--signature <path>] [--identity-token <token>] [--verify]');
  process.exit(1);
}

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  const entry = args.find((arg) => arg.startsWith(`${flag}=`));
  return entry ? entry.split('=')[1] : undefined;
};

const tool = getArgValue('--tool');
const keyPath = getArgValue('--key');
const signaturePath = getArgValue('--signature');
const identityToken = getArgValue('--identity-token');
const verify = args.includes('--verify');

(async () => {
  if (verify) {
    const verified = await verifyArtifact({ artifact, tool, keyPath, signaturePath });
    if (!verified) {
      process.exit(1);
    }
    return;
  }

  await signArtifact({ artifact, tool, keyPath, signaturePath, identityToken });
})().catch((error) => {
  console.error('Error signing/verifying artifact:', error.message);
  process.exit(1);
});
