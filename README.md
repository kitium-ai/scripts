# @kitiumai/scripts

A comprehensive collection of reusable scripts and utilities for the Kitium AI organization. Built following enterprise-grade standards used by leading product companies.

## Features

- **Build Utilities**: TypeScript compilation, production builds, type checking, watch mode
- **Test Utilities**: Unit testing, coverage reports, test discovery, watch mode
- **Lint & Format**: ESLint integration, Prettier formatting, code quality checks
- **Git Utilities**: Branch management, commits, pushing/pulling, tag management
- **Core Utils**: Command execution, file operations, logging, environment handling

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
│   └── git/
│       └── index.ts             # Git operations
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
    "type-check": "node -e \"import('@kitiumai/scripts').then(m => m.typeCheck())\""
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

Apache-2.0

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
