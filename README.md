# @kitiumai/scripts

A comprehensive collection of reusable scripts and utilities for the Kitium AI organization. Built following enterprise-grade standards used by leading product companies.

## Features

- **Build Utilities**: TypeScript compilation, production builds, type checking, watch mode
- **Test Utilities**: Unit testing, coverage reports, test discovery, watch mode
- **Lint & Format**: ESLint integration, Prettier formatting, code quality checks
- **Git Utilities**: Branch management, commits, pushing/pulling, tag management
- **Dependency Management**: Detect and fix deprecated dependencies automatically
- **Core Utils**: Command execution, file operations, logging, environment handling
- **Security & Compliance**: Secret scanning orchestration, dependency audits, policy enforcement
- **Developer Experience Guardrails**: Conventional commit validation, shared config enforcement, CODEOWNERS verification
- **Release Automation**: Changeset aggregation, prepublish verification, git/npm version sync
- **Operational Readiness**: Service smoke tests, rollout guards, log schema validation
- **Fleet Automation**: Bulk repo task runner, environment validation, drift detection

## Installation

```bash
npm install @kitiumai/scripts
```

## Quick Start

### Building Your Project

```typescript
import { buildTypescript, typeCheck, cleanBuild } from '@kitiumai/scripts/build';

// Full build with type checking
await buildTypescript({ production: true });
await typeCheck();

// Or use the all-in-one build
import { buildAll } from '@kitiumai/scripts/build';
await buildAll();
```

### Running Tests

```typescript
import { runTests, runTestsCoverage, watchTests } from '@kitiumai/scripts/test';

// Run all tests
await runTests();

// Run with coverage
await runTestsCoverage();

// Watch mode
await watchTests();
```

### Linting & Formatting

```typescript
import { runEslint, checkFormat, fixFormat, lintAll } from '@kitiumai/scripts/lint';

// Run ESLint
await runEslint({ fix: false });

// Check code formatting
await checkFormat();

// Fix formatting issues
await fixFormat();

// Run all checks
await lintAll(true); // true to auto-fix
```

### Git Operations

```typescript
import {
  getCurrentBranch,
  getChangedFiles,
  stageFiles,
  commit,
  push,
  setNpmToken,
  addNpmrc,
} from '@kitiumai/scripts/git';

const branch = await getCurrentBranch();
const changes = await getChangedFiles();
await stageFiles(changes);
await commit('feat: add new feature');
await push();

// NPM authentication
await setNpmToken(); // Uses NPM_TOKEN env var
await addNpmrc(); // Add .npmrc to current package
```

### Dependency Management

```typescript
import { fixDeprecatedDeps, checkDeprecatedDeps, applyFixes } from '@kitiumai/scripts/deps';

// Check and fix deprecated dependencies
await fixDeprecatedDeps(undefined, true); // autoFix = true

// Check only (no fixes)
const deprecated = await checkDeprecatedDeps('./package.json');
console.log(`Found ${deprecated.length} deprecated packages`);

// Apply fixes manually
await applyFixes('./package.json', deprecated, true);
```

### Utilities

```typescript
import {
  exec,
  pathExists,
  readJson,
  writeJson,
  findFiles,
  log,
  getEnv,
  measure,
  scanSecrets,
  auditDependencies,
  checkPolicyCompliance,
  validateCommits,
  ensureSharedConfigs,
  checkCodeownersCoverage,
  prepareReleaseNotes,
  verifyPublishState,
  syncVersionTags,
  smokeServices,
  rolloutGuard,
  verifyLogSchemas,
  runBulkRepoTask,
  validateEnv,
  detectDrift,
} from '@kitiumai/scripts';

// Execute commands
const result = await exec('npm', ['list']);

// File operations
const exists = await pathExists('./src');
const config = await readJson('./config.json');

// Logging
log('info', 'Starting deployment');
log('success', 'Build completed');
log('warn', 'Deprecated API');
log('error', 'Failed to connect');

// Measure execution time
await measure('Build', async () => {
  // your code here
});

// Run secret scan with gitleaks
await scanSecrets({ configPath: 'tooling/config/gitleaks.toml' });

// Ensure commits follow conventional commits
await validateCommits({ from: 'origin/main', to: 'HEAD' });

// Prepare release notes from changesets
const notes = await prepareReleaseNotes();
console.log(notes.markdown);

// Run smoke tests before rollout
await smokeServices([{ name: 'API', url: 'https://api.example.com/health' }]);

// Validate environment before running bulk operations
await validateEnv({ requiredEnv: ['NPM_TOKEN'], requiredCommands: [{ cmd: 'pnpm', minVersion: '9.0.0' }] });
```

## API Reference

### Build Module

#### `buildTypescript(options?)`

Build the TypeScript project.

**Parameters:**
- `options.srcDir` - Source directory
- `options.outDir` - Output directory
- `options.production` - Production mode (default: true)
- `options.sourceMaps` - Generate source maps (default: true)
- `options.flags` - Additional tsc flags

**Example:**
```typescript
await buildTypescript({ production: true });
```

#### `typeCheck()`

Run TypeScript type checking without emitting.

#### `cleanBuild()`

Remove build artifacts.

#### `buildWatch()`

Run TypeScript compiler in watch mode.

#### `buildAll()`

Run complete build pipeline (clean → build → type check).

### Test Module

#### `runTests(options?)`

Run unit tests.

**Parameters:**
- `options.pattern` - Test file pattern
- `options.coverage` - Generate coverage report
- `options.watch` - Watch mode
- `options.sequential` - Run tests sequentially
- `options.flags` - Additional test flags

**Example:**
```typescript
await runTests({ coverage: true });
```

#### `runTestsCoverage()`

Run tests with coverage analysis.

#### `watchTests()`

Run tests in watch mode.

#### `findTestFiles(pattern?)`

Find all test files matching pattern (default: `*.test.ts`).

#### `validateTests()`

Validate test setup and check for test files.

### Lint Module

#### `runEslint(options?)`

Run ESLint.

**Parameters:**
- `options.paths` - Files to lint (default: ['.'])
- `options.fix` - Auto-fix issues
- `options.ext` - File extensions (default: ['.ts', '.tsx'])
- `options.verbose` - Detailed output
- `options.flags` - Additional eslint flags

**Example:**
```typescript
await runEslint({ fix: true });
```

#### `checkFormat(options?)`

Check code formatting with Prettier.

#### `fixFormat(options?)`

Fix code formatting issues.

#### `lintAll(fix?)`

Run all lint checks (ESLint + Prettier).

#### `watchLint()`

Run ESLint in watch mode.

#### `generateLintReport()`

Generate JSON lint report.

### Git Module

#### `getCurrentBranch()`

Get the current git branch name.

#### `isWorkingDirectoryClean()`

Check if working directory has no uncommitted changes.

#### `getChangedFiles()`

Get list of changed files.

#### `stageFiles(files)`

Stage files for commit.

**Example:**
```typescript
const files = await getChangedFiles();
await stageFiles(files);
```

#### `commit(message, options?)`

Create a commit.

**Example:**
```typescript
await commit('feat: add new feature');
```

#### `push(branch?, remote?)`

Push to remote (default: origin).

**Example:**
```typescript
await push('main', 'origin');
```

#### `pull(branch?, remote?)`

Pull from remote.

#### `createBranch(name, startPoint?)`

Create and switch to a new branch.

#### `switchBranch(name)`

Switch to an existing branch.

#### `listBranches()`

Get list of all branches.

#### `getStatus()`

Get git status output.

#### `listTags()`

Get list of git tags.

#### `createTag(name, message?)`

Create a git tag.

#### `setNpmToken(token?, options?)`

Set NPM authentication token. Updates both local `.npmrc` and user-level `.npmrc` files.

**Parameters:**
- `token` - NPM token (optional, defaults to `NPM_TOKEN` env var or hardcoded default)
- `options.verify` - Whether to verify authentication after setting (default: true)

**Example:**
```typescript
import { setNpmToken } from '@kitiumai/scripts/git';

// Set token from environment variable
await setNpmToken();

// Set specific token
await setNpmToken('npm_xxxxxxxxxxxxx');

// Set token without verification
await setNpmToken(undefined, { verify: false });
```

#### `addNpmrc(force?)`

Add `.npmrc` configuration to current package directory. Copies `.npmrc-package-template` from monorepo root.

**Parameters:**
- `force` - Whether to overwrite existing `.npmrc` (default: false)

**Example:**
```typescript
import { addNpmrc } from '@kitiumai/scripts/git';

// Add .npmrc (fails if exists)
await addNpmrc();

// Force overwrite existing .npmrc
await addNpmrc(true);
```

### Deps Module

#### `fixDeprecatedDeps(packagePath?, autoFix?)`

Main function to check and fix deprecated dependencies in a package.

**Parameters:**
- `packagePath` - Optional path to package directory (default: current working directory)
- `autoFix` - Whether to automatically apply fixes (default: false)

**Example:**
```typescript
import { fixDeprecatedDeps } from '@kitiumai/scripts/deps';

// Check and auto-fix deprecated dependencies
await fixDeprecatedDeps(undefined, true);

// Check specific package
await fixDeprecatedDeps('./packages/my-package', false);
```

#### `checkDeprecatedDeps(packageJsonPath)`

Check for deprecated dependencies in a package.

**Parameters:**
- `packageJsonPath` - Path to package.json file

**Returns:** Array of deprecated packages with their information

**Example:**
```typescript
import { checkDeprecatedDeps } from '@kitiumai/scripts/deps';

const deprecated = await checkDeprecatedDeps('./package.json');
for (const dep of deprecated) {
  console.log(`${dep.name}@${dep.version}: ${dep.reason}`);
}
```

#### `applyFixes(packageJsonPath, deprecated, autoFix?)`

Apply fixes for deprecated dependencies by updating package.json with overrides.

**Parameters:**
- `packageJsonPath` - Path to package.json file
- `deprecated` - Array of deprecated packages to fix
- `autoFix` - Whether to apply fixes without confirmation (default: false)

**Returns:** Boolean indicating if changes were made

**Example:**
```typescript
import { checkDeprecatedDeps, applyFixes } from '@kitiumai/scripts/deps';

const deprecated = await checkDeprecatedDeps('./package.json');
await applyFixes('./package.json', deprecated, true);
```

#### `findDependents(packageJsonPath, depName)`

Find which packages depend on a deprecated package.

**Parameters:**
- `packageJsonPath` - Path to package.json file
- `depName` - Name of the deprecated package

**Returns:** Array of package names that depend on the deprecated package

**Example:**
```typescript
import { findDependents } from '@kitiumai/scripts/deps';

const dependents = findDependents('./package.json', 'lodash.get');
console.log(`Used by: ${dependents.join(', ')}`);
```

#### `findPackageJson(startDir)`

Find package.json file in a directory tree.

**Parameters:**
- `startDir` - Starting directory to search from

**Returns:** Path to package.json or null if not found

#### `getPackageManager(packageJsonPath)`

Detect the package manager (npm, pnpm, or yarn) used in a project.

**Parameters:**
- `packageJsonPath` - Path to package.json file

**Returns:** 'npm' | 'pnpm' | 'yarn'

#### `DEPRECATED_FIXES`

A record of known deprecated packages and their fix strategies.

**Example:**
```typescript
import { DEPRECATED_FIXES } from '@kitiumai/scripts/deps';

// Access fix information
const lodashFix = DEPRECATED_FIXES['lodash.get'];
console.log(lodashFix.reason); // "lodash.get is deprecated..."
```

### Utils Module

#### `exec(command, args?, options?)`

Execute a shell command and capture output.

**Returns:**
```typescript
{
  code: number;     // Exit code
  stdout: string;   // Standard output
  stderr: string;   // Standard error
}
```

#### `pathExists(path)`

Check if a file or directory exists.

#### `readJson(path)`

Read and parse a JSON file.

#### `writeJson(path, data, pretty?)`

Write an object as JSON.

#### `findFiles(dir, pattern)`

Find files matching a regex pattern.

#### `getProjectRoot()`

Get the root directory of the current project.

#### `log(level, message)`

Log a message with prefix.

**Levels:** 'info', 'warn', 'error', 'success'

#### `getEnv(name, defaultValue?)`

Get environment variable or throw if not set.

#### `measure(label, fn)`

Measure execution time of an async function.

### Security Module

#### `scanSecrets(options?)`

Run Gitleaks or TruffleHog secret scans. Options: `scanner`, `source`, `configPath`, `failOnFinding`, `extraArgs`.

#### `auditDependencies(options?)`

Executes npm/pnpm audit with normalized output. Configure `packagePath`, `severityThreshold`, `includeDev`, and `cwd`.

#### `checkPolicyCompliance(options?)`

Enforces license allowlists/denylists and vulnerability budgets. Accepts `policyFile`, `licenseReportPath`, `auditSummary`, or `fallbackPolicy`.

### Developer Experience Module

#### `validateCommits(options?)`

Checks Conventional Commit compliance for a git range. Options include `from`, `to`, `allowedTypes`, `allowMergeCommits`, `requireScope`, `maxCommits`.

#### `ensureSharedConfigs(options?)`

Audits packages for shared `@kitiumai/config` usage. Reports missing devDependencies, tsconfig extends, or ESLint references.

#### `checkCodeownersCoverage(files?)`

Ensures every changed file has a CODEOWNERS match. Provide explicit file paths or let it derive from `git status`.

### Release Module

#### `prepareReleaseNotes(options?)`

Aggregates Changesets into entries grouped by `package` or `type` and returns rendered markdown.

#### `verifyPublishState(options?)`

Runs pre-publish commands (default `pnpm lint`, `pnpm test`, `pnpm build`) and surfaces any failures.

#### `syncVersionTags(options?)`

Confirms `package.json` version matches git tags and npm registry. Options: `packagePath`, `tagPrefix`, `registry`.

### Operations Module

#### `smokeServices(targets)`

HTTP smoke tests for staging/prod endpoints. Each target supplies `name`, `url`, optional `method`, `expectedStatus`, `timeoutMs`.

#### `rolloutGuard(input)`

Applies release gating logic (error budgets, incidents, freezes, approvals) and returns `{ allow, reasons }`.

#### `verifyLogSchemas(options?)`

Validates logging schema files (default `schemas/logging`) contain required fields (e.g., `name`, `version`).

### Automation Module

#### `runBulkRepoTask(options)`

Runs a command across multiple directories with concurrency control. Options: `command`, `targets`, `concurrency`, `stopOnError`.

#### `validateEnv(options?)`

Checks required environment variables and CLI dependencies (`cmd`, `args`, `minVersion`) before running workflows.

#### `detectDrift(options)`

Detects modified/untracked files for monitored paths using `git status`. Options: `paths`, `includeUntracked`.

## Project Structure

```
@kitiumai/scripts/
├── src/
│   ├── index.ts                 # Main entry point
│   ├── utils/
│   │   └── index.ts             # Core utilities
│   ├── build/
│   │   └── index.ts             # Build system utilities
│   ├── test/
│   │   └── index.ts             # Testing utilities
│   ├── lint/
│   │   └── index.ts             # Linting and formatting
│   ├── git/
│   │   └── index.ts             # Git operations
│   ├── deps/
│   │   └── index.ts             # Deprecated dependency management
│   ├── security/
│   │   └── index.ts             # Security & compliance
│   ├── dx/
│   │   └── index.ts             # Dev experience guardrails
│   ├── release/
│   │   └── index.ts             # Release automation
│   ├── operations/
│   │   └── index.ts             # Prod readiness checks
│   └── automation/
│       └── index.ts             # Fleet automation helpers
├── bin/
│   ├── fix-deprecated-deps.js   # CLI for deprecated deps
│   ├── set-npm-token.js
│   └── ...
├── dist/                        # Compiled output
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc.json
└── README.md
```

## Configuration

The package respects standard configuration files:

- **tsconfig.json** - TypeScript configuration
- **.eslintrc.json** - ESLint rules
- **.prettierrc.json** - Prettier formatting options

## CLI Tools

The package provides command-line tools via `bin` entries:

### `set-npm-token`

Set NPM authentication token for publishing packages.

```bash
# Use default token or NPM_TOKEN env var
npx set-npm-token

# Use specific token
npx set-npm-token npm_xxxxxxxxxxxxx
```

### `add-npmrc`

Add `.npmrc` configuration to current package directory.

```bash
# Add .npmrc (fails if exists)
npx add-npmrc

# Force overwrite existing .npmrc
npx add-npmrc --force
```

### `fix-deprecated-deps`

Detect and fix deprecated dependencies in your project.

```bash
# Check for deprecated dependencies
npx fix-deprecated-deps

# Automatically fix deprecated dependencies
npx fix-deprecated-deps --fix

# Check a specific package
npx fix-deprecated-deps --package=./packages/my-package

# Auto-fix a specific package
npx fix-deprecated-deps --fix --package=./packages/my-package
```

**Features:**
- Detects deprecated packages using npm/pnpm audit
- Identifies which packages depend on deprecated packages
- Automatically applies fixes via package.json overrides
- Supports npm, pnpm, and yarn
- Works in monorepos and single packages

**Known Fixes:**
- `lodash.get` → Replaced with `lodash@^4.17.21`
- `subscriptions-transport-ws` → Suggests updating parent package (`eslint-plugin-graphql`)

### `ensure-changeset`

Ensure `.changeset` directory and `config.json` exist in the project root.

```bash
# Create .changeset if missing
npx ensure-changeset

# Force overwrite existing config
npx ensure-changeset --force
```

## Scripts

Common package.json scripts for your projects:

```json
{
  "scripts": {
    "build": "node -e \"import('@kitiumai/scripts').then(m => m.buildAll())\"",
    "dev": "node -e \"import('@kitiumai/scripts').then(m => m.buildWatch())\"",
    "test": "node -e \"import('@kitiumai/scripts').then(m => m.runTests())\"",
    "test:cov": "node -e \"import('@kitiumai/scripts').then(m => m.runTestsCoverage())\"",
    "lint": "node -e \"import('@kitiumai/scripts').then(m => m.lintAll(false))\"",
    "lint:fix": "node -e \"import('@kitiumai/scripts').then(m => m.lintAll(true))\"",
    "type-check": "node -e \"import('@kitiumai/scripts').then(m => m.typeCheck())\"",
    "fix:deprecated": "fix-deprecated-deps",
    "fix:deprecated:auto": "fix-deprecated-deps --fix"
  }
}
```

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0
- TypeScript (if building TS projects)

## Enterprise Standards

This package follows standards and best practices from:

- **Google's TypeScript Style Guide**
- **Airbnb's JavaScript Style Guide**
- **Meta's Open Source Best Practices**
- **OWASP Security Guidelines**

### Key Features:

- ✅ Full TypeScript support with strict mode
- ✅ Comprehensive error handling
- ✅ Type-safe APIs
- ✅ Production-ready utilities
- ✅ ESM module support
- ✅ Proper exit codes and error reporting
- ✅ Extensible design
- ✅ Zero dependencies

## License

MIT

## Contributing

When contributing to @kitiumai/scripts:

1. Ensure all code is TypeScript with strict mode
2. Add tests for new functionality
3. Run `npm run lint:fix` before committing
4. Keep the API surface clean and well-documented
5. Follow the existing code patterns

## Support

For issues, questions, or contributions, please visit:
https://github.com/kitiumai/scripts

---

Built with ❤️ for the Kitium AI organization
