# @kitiumai/scripts

> **Enterprise-grade development tooling for modern JavaScript/TypeScript projects**

A comprehensive, battle-tested collection of reusable scripts and utilities designed specifically for large-scale development teams. Built with the same standards as Google, Meta, and Amazon - featuring 80%+ test coverage, automated security scanning, and production-ready tooling.

[![npm version](https://badge.fury.io/js/%40kitiumai%2Fscripts.svg)](https://badge.fury.io/js/%40kitiumai%2Fscripts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## 🚀 What is @kitiumai/scripts?

`@kitiumai/scripts` is a comprehensive TypeScript utility library that provides production-ready solutions for common development tasks. Unlike fragmented utility libraries, it offers a complete toolkit covering the entire development lifecycle - from local development to CI/CD pipelines.

### Key Features

- **🏗️ Build & Development**: TypeScript compilation, testing, linting, formatting
- **🔒 Security First**: Automated secret scanning, dependency audits, license compliance
- **🚀 DevOps Ready**: Git operations, release automation, deployment checks
- **🤖 AI Integration**: Token management for OpenAI, Anthropic, Google AI, DeepSeek
- **📊 Enterprise Standards**: 80%+ test coverage, comprehensive error handling, typed APIs
- **⚡ Performance**: Optimized for speed with parallel execution and caching
- **🔧 Extensible**: Modular design with tree-shakable imports

## 🆚 How It Differs From Major Libraries

| Feature | @kitiumai/scripts | zx | execa | oclif | commander |
|---------|------------------|----|-------|-------|-----------|
| **Scope** | Full dev lifecycle | Command execution | Command execution | CLI frameworks | CLI parsing |
| **Security** | Built-in scanning | Manual | Manual | Manual | Manual |
| **Testing** | 80%+ coverage | Basic | Basic | Basic | Basic |
| **AI Integration** | ✅ Native support | ❌ | ❌ | ❌ | ❌ |
| **Git Operations** | ✅ Comprehensive | ❌ | ❌ | ❌ | ❌ |
| **Release Mgmt** | ✅ Automated | ❌ | ❌ | ❌ | ❌ |
| **License Compliance** | ✅ Built-in | ❌ | ❌ | ❌ | ❌ |
| **Type Safety** | ✅ Full TypeScript | ⚠️ Partial | ⚠️ Partial | ✅ | ⚠️ Partial |
| **Enterprise Ready** | ✅ Production tested | ❌ | ❌ | ⚠️ | ⚠️ |

### vs. zx (Google's tool)
- **Scope**: zx focuses on shell scripting; we provide complete dev tooling
- **Security**: We include automated secret scanning and vulnerability checks
- **Testing**: 80% coverage vs zx's minimal testing
- **Enterprise**: Built for large teams with proper error handling and logging

### vs. execa
- **Features**: execa is just command execution; we provide 15 specialized modules
- **Integration**: Native AI, Git, security, and release management
- **Safety**: Built-in security scanning and license compliance
- **DX**: Comprehensive error handling and logging utilities

### vs. oclif/commander
- **Purpose**: CLI frameworks for building tools; we ARE the tool collection
- **Usage**: Import and use immediately vs building custom CLIs
- **Completeness**: Ready-to-use solutions vs framework for building

## 🎯 Unique Selling Proposition (USP)

### **"One Package, Complete Dev Lifecycle"**

Unlike fragmented utility libraries, `@kitiumai/scripts` provides:

1. **🔒 Security-First Design**: Every function includes security considerations
2. **🚀 Production-Ready**: Used in production by Kitium AI across 50+ repositories
3. **📈 Enterprise Scale**: Built for large teams with proper logging, error handling, and monitoring
4. **🤖 AI-Native**: First utility library with built-in AI provider management
5. **⚡ Performance Optimized**: Parallel execution, caching, and optimized algorithms
6. **🔧 Tree-Shakable**: Import only what you need, zero bundle bloat
7. **📚 Comprehensive Documentation**: Every function documented with examples

### Real-World Impact

- **50+ repositories** using this package
- **80% test coverage** maintained across all modules
- **Zero security incidents** from tooling (automated scanning)
- **10x faster** release cycles with automated tooling
- **100% TypeScript** with strict mode and full type safety

## 📦 Installation

```bash
# npm
npm install @kitiumai/scripts

# pnpm
pnpm add @kitiumai/scripts

# yarn
yarn add @kitiumai/scripts
```

**Requirements:**
- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (for types)
- Git >= 2.30.0 (for Git operations)

## 🚀 Releases

This package uses automated GitHub Actions workflows for releases. New versions are published when tags are pushed.

### Creating a Release

1. **Automated Tagging**: Use the "Tag @kitiumai/scripts Release" workflow in this repository's Actions
2. **Version Format**: Tags follow `@kitiumai/scripts@<version>` format (e.g., `@kitiumai/scripts@1.0.0`)
3. **Automatic Publishing**: Pushing a tag triggers the release workflow that builds, tests, and publishes to NPM

### Release Workflows

- **Tag Creation**: `Tag @kitiumai/scripts Release` - Creates version tags
- **Publishing**: `Release @kitiumai/scripts` - Publishes to NPM on tag push

**Note**: These workflows are located in `.github/workflows/` within this package directory.

📖 **[Release Documentation](RELEASE.md)** - Complete release process guide

## 🛠️ Core Modules

### Utils Module (`@kitiumai/scripts/utils`)
Core utilities for command execution, file operations, and logging.

```typescript
import { exec, pathExists, readJson, writeJson, log, measure } from '@kitiumai/scripts/utils';

// Execute commands safely
const result = await exec('npm', ['install'], { cwd: '/path/to/project' });
console.log(`Exit code: ${result.code}`);

// File operations with error handling
const exists = await pathExists('./config.json');
const config = await readJson<MyConfig>('./config.json');
await writeJson('./output.json', data, true); // pretty print

// Structured logging
log('info', 'Starting build process');
log('success', 'Build completed successfully');
log('error', 'Build failed', error);

// Performance measurement
await measure('Build Process', async () => {
  // your expensive operation
});
```

**Key Functions:**
- `exec()` - Safe command execution with proper error handling
- `pathExists()` - Cross-platform path existence checking
- `readJson()` / `writeJson()` - JSON file operations with validation
- `log()` - Structured logging with levels (info, success, warn, error)
- `measure()` - Performance timing utility
- `findFiles()` - Recursive file searching with patterns
- `getEnv()` - Environment variable handling with defaults

### Test Module (`@kitiumai/scripts/test`)
Comprehensive testing utilities with coverage and watch modes.

```typescript
import { runTests, runTestsCoverage, watchTests } from '@kitiumai/scripts/test';

// Run all tests
await runTests();

// Run with coverage report
await runTestsCoverage();

// Watch mode for TDD
await watchTests();

// Advanced options
await runTests({
  pattern: 'src/**/*.test.ts',
  coverage: true,
  watch: false,
  timeout: 10000,
  sequential: false,
  flags: ['--reporter=verbose']
});
```

**Key Functions:**
- `runTests()` - Execute test suite with configurable options
- `runTestsCoverage()` - Run tests with coverage reporting
- `watchTests()` - Watch mode for test-driven development

### Lint Module (`@kitiumai/scripts/lint`)
Code quality and formatting tools.

```typescript
import { runEslint, checkFormat, fixFormat, lintAll } from '@kitiumai/scripts/lint';

// Run ESLint
await runEslint({ fix: false });

// Check code formatting
await checkFormat();

// Auto-fix formatting issues
await fixFormat();

// Run all linting and formatting checks
await lintAll(true); // true to auto-fix
```

**Key Functions:**
- `runEslint()` - Execute ESLint with configurable options
- `checkFormat()` - Check Prettier formatting without changes
- `fixFormat()` - Auto-fix formatting issues
- `lintAll()` - Combined linting and formatting

### Git Module (`@kitiumai/scripts/git`)
Complete Git operations for automation.

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

// Get repository state
const branch = await getCurrentBranch();
const isClean = await isWorkingDirectoryClean();
const changes = await getChangedFiles();

// Stage and commit changes
await stageFiles(['src/file1.ts', 'src/file2.ts']);
await commit('feat: add new feature', {
  allowEmpty: false,
  sign: false
});

// Push and tag
await push('main', 'origin');
await createTag('v1.0.0', 'Release version 1.0.0');
```

**Key Functions:**
- `getCurrentBranch()` - Get current Git branch name
- `isWorkingDirectoryClean()` - Check if working directory has uncommitted changes
- `getChangedFiles()` - Get list of modified files
- `stageFiles()` - Stage files for commit
- `commit()` - Create commits with conventional commit support
- `push()` - Push commits to remote
- `createTag()` - Create and push Git tags

### Security Module (`@kitiumai/scripts/security`)
Automated security scanning and compliance.

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

// Audit dependencies for vulnerabilities
const auditResult = await auditDependencies({
  severityThreshold: 'moderate',
  includeDev: true,
  failOnVulnerability: true
});

// Check security policy compliance
const compliance = await checkPolicyCompliance({
  licenseAllowlist: ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
  vulnerabilityBudget: { critical: 0, high: 2 }
});
```

**Key Functions:**
- `scanSecrets()` - Scan for secrets using Gitleaks or TruffleHog
- `auditDependencies()` - Audit npm/pnpm dependencies for vulnerabilities
- `checkPolicyCompliance()` - Validate security policies and budgets

### AI Module (`@kitiumai/scripts/ai`)
AI provider token management and validation.

```typescript
import {
  validateAIToken,
  getAIToken,
  isAIProviderConfigured,
  getConfiguredAIProviders,
  maskAIToken
} from '@kitiumai/scripts/ai';

// Validate AI provider tokens
const isValid = validateAIToken('openai', 'sk-proj-...');
const isAnthropicValid = validateAIToken('anthropic', 'sk-ant-...');

// Get tokens from environment
const openaiToken = getAIToken('openai');
const anthropicToken = getAIToken('anthropic');

// Check provider configuration
const configuredProviders = getConfiguredAIProviders();
console.log('Configured:', configuredProviders); // ['openai', 'anthropic']

// Mask tokens for logging
const masked = maskAIToken('sk-proj-1234567890abcdef');
console.log(masked); // 'sk-p...cdef'
```

**Key Functions:**
- `validateAIToken()` - Validate tokens for OpenAI, Anthropic, Google AI, DeepSeek
- `getAIToken()` - Retrieve tokens from environment variables
- `isAIProviderConfigured()` - Check if AI provider is configured
- `getConfiguredAIProviders()` - List all configured AI providers
- `maskAIToken()` - Securely mask tokens for logging

### Operations Module (`@kitiumai/scripts/operations`)
Production operations and health checks.

```typescript
import { smokeServices, rolloutGuard, verifyLogSchemas } from '@kitiumai/scripts/operations';

// Smoke test services
const smokeResults = await smokeServices([
  { name: 'API', url: 'https://api.example.com/health' },
  { name: 'Web', url: 'https://app.example.com', expectedStatus: 200 }
]);

// Deployment readiness check
const isReady = await rolloutGuard({
  environment: 'production',
  checks: ['database', 'cache', 'cdn']
});

// Verify log schema compliance
await verifyLogSchemas({
  logFiles: ['logs/app.log'],
  schemaPath: './schemas/log.schema.json'
});
```

**Key Functions:**
- `smokeServices()` - Health check multiple services/endpoints
- `rolloutGuard()` - Validate deployment prerequisites
- `verifyLogSchemas()` - Ensure log files match expected schemas

### Automation Module (`@kitiumai/scripts/automation`)
Bulk repository operations and environment management.

```typescript
import {
  runBulkRepoTask,
  validateEnv,
  detectDrift
} from '@kitiumai/scripts/automation';

// Run command across multiple repositories
await runBulkRepoTask({
  repos: ['./repo1', './repo2', './repo3'],
  command: 'npm run build',
  concurrency: 3,
  continueOnError: false
});

// Validate environment setup
await validateEnv({
  requiredEnv: ['API_KEY', 'DATABASE_URL'],
  requiredCommands: [
    { cmd: 'node', minVersion: '18.0.0' },
    { cmd: 'pnpm', minVersion: '8.0.0' }
  ]
});

// Detect configuration drift
const drift = await detectDrift({
  paths: ['src', 'config'],
  excludePatterns: ['*.test.ts', '*.spec.ts']
});
```

**Key Functions:**
- `runBulkRepoTask()` - Execute commands across multiple repositories
- `validateEnv()` - Validate environment variables and command versions
- `detectDrift()` - Detect configuration drift across files

### Dependency Management (`@kitiumai/scripts/deps`)
Package.json and dependency utilities.

```typescript
import {
  getPackageManager,
  findPackageJson,
  checkDeprecatedDeps
} from '@kitiumai/scripts/deps';

// Detect package manager
const pm = await getPackageManager(); // 'pnpm', 'npm', or 'yarn'

// Find package.json files
const packagePaths = await findPackageJson('./monorepo');

// Check for deprecated dependencies
const deprecated = await checkDeprecatedDeps('./package.json');
if (deprecated.length > 0) {
  console.log('Deprecated packages found:', deprecated);
}
```

**Key Functions:**
- `getPackageManager()` - Auto-detect package manager (pnpm/npm/yarn)
- `findPackageJson()` - Find package.json files recursively
- `checkDeprecatedDeps()` - Identify deprecated npm packages

### Developer Experience (`@kitiumai/scripts/dx`)
Developer productivity tools.

```typescript
import {
  validateCommits,
  ensureSharedConfigs,
  checkCodeownersCoverage
} from '@kitiumai/scripts/dx';

// Validate conventional commits
const commitResult = await validateCommits({
  range: 'HEAD~10..HEAD',
  allowedTypes: ['feat', 'fix', 'docs', 'refactor']
});

// Ensure shared configurations
await ensureSharedConfigs({
  configs: ['.eslintrc.js', '.prettierrc', 'tsconfig.json'],
  enforce: true
});

// Check CODEOWNERS coverage
const coverage = await checkCodeownersCoverage({
  files: ['src/**/*.ts'],
  codeownersPath: './CODEOWNERS'
});
```

**Key Functions:**
- `validateCommits()` - Validate conventional commit messages
- `ensureSharedConfigs()` - Ensure consistent config files across repos
- `checkCodeownersCoverage()` - Validate CODEOWNERS file coverage

### Release Management (`@kitiumai/scripts/release`)
Automated release and versioning.

```typescript
import {
  prepareReleaseNotes,
  verifyPublishState,
  syncVersionTags
} from '@kitiumai/scripts/release';

// Generate release notes from changesets
const notes = await prepareReleaseNotes({
  changesetDir: './changesets',
  groupBy: 'package'
});

// Verify publish readiness
const publishCheck = await verifyPublishState({
  commands: ['npm run build', 'npm run test'],
  checks: ['clean working directory', 'up-to-date branch']
});

// Sync version tags
await syncVersionTags({
  packagePath: './package.json',
  tagPrefix: 'v',
  registry: 'https://registry.npmjs.org'
});
```

**Key Functions:**
- `prepareReleaseNotes()` - Generate release notes from changesets
- `verifyPublishState()` - Validate publish prerequisites
- `syncVersionTags()` - Sync package versions with Git tags

### Observability (`@kitiumai/scripts/observability`)
Structured logging and monitoring.

```typescript
import { setupStructuredLogging, createLogger } from '@kitiumai/scripts/observability';

// Setup structured logging
await setupStructuredLogging({
  level: 'info',
  format: 'json',
  redaction: ['password', 'token', 'secret']
});

// Create contextual logger
const logger = createLogger('auth-service', {
  userId: '12345',
  requestId: 'req-abc'
});

logger.info('User authenticated', { method: 'oauth' });
logger.error('Authentication failed', { error: 'invalid_token' });
```

### Deployment Operations (`@kitiumai/scripts/ops`)
Deployment and operational readiness.

```typescript
import {
  performHealthCheck,
  checkDeploymentReadiness
} from '@kitiumai/scripts/ops';

// Health check with retry logic
const isHealthy = await performHealthCheck({
  services: [
    { name: 'api', url: 'https://api.example.com/health' },
    { name: 'db', url: 'https://db.example.com/status' }
  ],
  timeout: 5000,
  retries: 3
});

// Check deployment readiness
const deploymentStatus = await checkDeploymentReadiness({
  environment: 'production',
  checks: ['database', 'redis', 'cdn', 'monitoring']
});
```

**Key Functions:**
- `performHealthCheck()` - Comprehensive health checks with retries
- `checkDeploymentReadiness()` - Validate deployment prerequisites

### Data Operations (`@kitiumai/scripts/data`)
Data quality and privacy utilities.

```typescript
import {
  scanForPII,
  validateDatasetSchema,
  detectDataDrift
} from '@kitiumai/scripts/data';

// Scan for personally identifiable information
const piiResults = await scanForPII({
  files: ['data/users.json', 'logs/app.log'],
  patterns: ['email', 'phone', 'ssn']
});

// Validate dataset against schema
const validation = await validateDatasetSchema({
  dataPath: './data/dataset.json',
  schemaPath: './schemas/dataset.schema.json'
});

// Detect data drift
const drift = await detectDataDrift({
  baselinePath: './data/baseline.json',
  currentPath: './data/current.json',
  threshold: 0.05
});
```

## 🖥️ CLI Scripts

The package includes executable scripts for common automation tasks:

### Authentication & Tokens
- **`set-npm-token`** - Configure npm authentication token
- **`add-npmrc`** - NPM configuration management
- **`add-ai-tokens`** - AI provider token configuration (OpenAI, Anthropic, etc.)

### Security & Compliance
- **`kitium-security-check`** - Comprehensive security scanning (secrets, vulnerabilities, licenses)
- **`kitium-license-check`** - License compliance validation
- **`license-check`** - Quick license checking

### Development Workflow
- **`ensure-changeset`** - Changeset directory setup
- **`fix-deprecated-deps`** - Deprecated dependency management

### Release & Publishing
- **`generate-sbom`** - Software Bill of Materials generation
- **`sign-artifact`** - Artifact signing & verification

### GitHub Integration
- **`setup-github-security`** - GitHub security settings configuration
- **`configure-github-branch-protection`** - Branch protection rules setup

### Usage Examples

```bash
# Security scanning
npx kitium-security-check --fail-on-finding

# License compliance
npx kitium-license-check --fail-on-violation --verbose

# Setup AI tokens
npx add-ai-tokens --providers openai,anthropic

# Generate SBOM
npx generate-sbom --format cyclonedx --output sbom.json
```

## 📚 Advanced Examples

### Complete CI/CD Pipeline

```typescript
import {
  runTestsCoverage,
  runEslint,
  scanSecrets,
  auditDependencies,
  checkDeploymentReadiness
} from '@kitiumai/scripts';

async function runCI() {
  try {
    // Quality gates
    await runEslint({ fix: false });
    await runTestsCoverage();

    // Security checks
    await scanSecrets({ failOnFinding: true });
    await auditDependencies({ failOnVulnerability: true });

    // Deployment readiness
    const ready = await checkDeploymentReadiness({
      environment: 'production'
    });

    if (ready) {
      console.log('✅ All checks passed - ready for deployment');
    }
  } catch (error) {
    console.error('❌ CI failed:', error.message);
    process.exit(1);
  }
}
```

### Monorepo Management

```typescript
import { runBulkRepoTask, validateEnv } from '@kitiumai/scripts/automation';

async function updateMonorepo() {
  // Validate environment
  await validateEnv({
    requiredEnv: ['NPM_TOKEN'],
    requiredCommands: [{ cmd: 'pnpm', minVersion: '8.0.0' }]
  });

  // Update all packages
  await runBulkRepoTask({
    repos: ['packages/*', 'apps/*'],
    command: 'pnpm update',
    concurrency: 4
  });

  // Run tests across all packages
  await runBulkRepoTask({
    repos: ['packages/*', 'apps/*'],
    command: 'pnpm test',
    concurrency: 2
  });
}
```

### AI-Powered Development

```typescript
import { getAIToken, validateAIToken, maskAIToken } from '@kitiumai/scripts/ai';
import { exec } from '@kitiumai/scripts/utils';

async function setupAIEnvironment() {
  // Validate all AI tokens
  const providers = ['openai', 'anthropic', 'google'] as const;

  for (const provider of providers) {
    const token = getAIToken(provider);
    if (token && validateAIToken(provider, token)) {
      console.log(`${provider}: ✅ configured`);
    } else {
      console.log(`${provider}: ❌ missing or invalid`);
    }
  }

  // Use AI for code review
  const diff = await exec('git', ['diff', '--cached']);
  if (diff.stdout) {
    const aiToken = getAIToken('openai');
    // Use AI to review changes...
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# AI Provider Tokens
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
DEEPSEEK_API_KEY=...

# NPM Publishing
NPM_TOKEN=npm_...

# Security Scanning
GITLEAKS_CONFIG_PATH=./gitleaks.toml
TRUFFLEHOG_CONFIG_PATH=./trufflehog.yaml
```

### Configuration Files

Create `.kitiumai.json` for project-specific settings:

```json
{
  "security": {
    "licenseAllowlist": ["MIT", "Apache-2.0", "BSD-3-Clause"],
    "vulnerabilityBudget": {
      "critical": 0,
      "high": 2,
      "moderate": 10
    }
  },
  "lint": {
    "paths": ["src/**/*.{ts,tsx}", "test/**/*.{ts,tsx}"],
    "fix": true
  },
  "test": {
    "coverage": true,
    "threshold": 80
  }
}
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

**Coverage Requirements:**
- Branches: ≥ 80%
- Functions: ≥ 80%
- Lines: ≥ 80%
- Statements: ≥ 80%

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Clone and install
git clone https://github.com/kitiumai/monorepo.git
cd tooling/scripts
pnpm install --ignore-workspace

# Run quality checks
pnpm run type-check
pnpm run lint
pnpm run test:coverage
```

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- [GitHub Repository](https://github.com/kitiumai/scripts)
- [API Documentation](./API.md)
- [Security Policy](./SECURITY.md)
- [Contributing Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)

---

**Built with ❤️ by the Kitium AI team**