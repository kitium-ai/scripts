#!/usr/bin/env node

import { generateSbom, validateSbom } from '../dist/security/index.js';

const args = process.argv.slice(2);
const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) return args[index + 1];
  const entry = args.find((arg) => arg.startsWith(`${flag}=`));
  return entry ? entry.split('=')[1] : undefined;
};

const target = getArgValue('--target') || process.cwd();
const output = getArgValue('--output');
const format = getArgValue('--format');
const tool = getArgValue('--tool');
const skipValidate = args.includes('--no-validate');

(async () => {
  const sbomPath = await generateSbom({ target, output, format, tool });
  if (!skipValidate) {
    await validateSbom({ sbomPath });
  }
})().catch((error) => {
  console.error('Error generating SBOM:', error.message);
  process.exit(1);
});
