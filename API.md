# API Documentation

## @kitiumai/scripts

Comprehensive TypeScript utilities for build, test, lint, git operations, and more.

### Installation

```bash
npm install @kitiumai/scripts
# or
pnpm add @kitiumai/scripts
# or
yarn add @kitiumai/scripts
```

### Core Modules

#### Utils Module

Core utilities for file operations, command execution, and logging.

```typescript
import { exec, pathExists, readJson, writeJson, log, measure } from '@kitiumai/scripts/utils';

// Execute commands
const result = await exec('npm', ['install'], { cwd: '/path/to/project' });

// File operations
const exists = await pathExists('./config.json');
const config = await readJson<MyConfig>('./config.json');
await writeJson('./output.json', data, true); // pretty print

// Logging
log('info', 'Starting process');
log('success', 'Build completed');
log('warn', 'Deprecated API usage');
log('error', 'Build failed');

// Performance measurement
await measure('Build Process', async () => {
  // your code here
});
```

#### Git Module

Git operations and version control utilities.

```typescript
import {
  getCurrentBranch,
  isWorkingDirectoryClean,
  getChangedFiles,
  stageFiles,
  commit,
  push,
  createTag
} from '@kitiumai/scripts/git';

const branch = await getCurrentBranch();
const isClean = await isWorkingDirectoryClean();
const changes = await getChangedFiles();

await stageFiles(['src/file1.ts', 'src/file2.ts']);
await commit('feat: add new feature');
await push('main', 'origin');
await createTag('v1.0.0', 'Release version 1.0.0');
```

#### Security Module

Security scanning and compliance utilities.

```typescript
import {
  scanSecrets,
  auditDependencies,
  checkPolicyCompliance
} from '@kitiumai/scripts/security';

// Scan for secrets
const secretResult = await scanSecrets({
  scanner: 'gitleaks',
  configPath: './gitleaks.toml',
  failOnFinding: true
});

// Audit dependencies
const auditResult = await auditDependencies({
  severityThreshold: 'moderate',
  includeDev: true
});

// Check compliance
const compliance = await checkPolicyCompliance({
  licenseAllowlist: ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
  vulnerabilityBudget: { critical: 0, high: 2 }
});
```

#### Types Module

Common TypeScript types and error classes.

```typescript
import {
  ScriptError,
  CommandError,
  FileError,
  ValidationError,
  ConfigError,
  NetworkError,
  type PackageJson,
  type GitCommit,
  type LogLevel
} from '@kitiumai/scripts/types';

// Use error classes
throw new CommandError('Command failed', 'npm install', 'stderr output');
throw new FileError('Cannot read file', '/path/to/file', 'read');
throw new ValidationError('Invalid email', 'email', 'not-an-email');
```

#### AI Module

AI service integration utilities.

```typescript
import {
  validateAIToken,
  getAIToken,
  isAIProviderConfigured,
  getConfiguredAIProviders,
  maskAIToken
} from '@kitiumai/scripts/ai';

// Validate tokens
const isValid = validateAIToken('openai', 'sk-...');

// Get configured providers
const providers = getConfiguredAIProviders();
console.log('Configured:', providers); // ['openai', 'anthropic']

// Mask tokens for logging
const masked = maskAIToken('sk-proj-1234567890abcdef');
console.log(masked); // 'sk-p...cdef'
```

### API Reference

For detailed API documentation, see [README.md](./README.md).

### Error Handling

All modules use consistent error handling with typed error classes:

```typescript
import { CommandError, FileError, ValidationError } from '@kitiumai/scripts/types';

try {
  await exec('invalid-command', []);
} catch (error) {
  if (error instanceof CommandError) {
    console.error('Command failed:', error.command);
    console.error('Exit code:', error.exitCode);
    console.error('Stderr:', error.stderr);
  }
}
```

### TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { PackageJson, GitCommit, ExecResult } from '@kitiumai/scripts';

const pkg: PackageJson = await readJson('./package.json');
const result: ExecResult = await exec('npm', ['test']);
```
