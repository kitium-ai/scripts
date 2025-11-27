#!/usr/bin/env node

import { enforceLicensePolicy } from '../dist/security/index.js';

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  const entry = args.find((arg) => arg.startsWith(`${flag}=`));
  return entry ? entry.split('=')[1] : undefined;
};

const root = getArgValue('--root');
const policyFile = getArgValue('--policy');
const allowed = getArgValue('--allowed');
const blocked = getArgValue('--blocked');
const ignore = getArgValue('--ignore');

(async () => {
  const result = await enforceLicensePolicy({
    root,
    policyFile,
    allowedLicenses: allowed ? allowed.split(',') : undefined,
    blockedLicenses: blocked ? blocked.split(',') : undefined,
    ignorePackages: ignore ? ignore.split(',') : undefined,
  });

  if (!result.passed) {
    process.exit(1);
  }
})().catch((error) => {
  console.error('Error checking licenses:', error.message);
  process.exit(1);
});
