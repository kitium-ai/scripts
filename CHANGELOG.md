## [0.2.0] - 2025-01-05

### Added

- Security automation module with `scanSecrets`, `auditDependencies`, and `checkPolicyCompliance`.
- Developer experience guardrails for `validateCommits`, `ensureSharedConfigs`, and `checkCodeownersCoverage`.
- Release automation helpers `prepareReleaseNotes`, `verifyPublishState`, and `syncVersionTags`.
- Operational readiness utilities `smokeServices`, `rolloutGuard`, and `verifyLogSchemas`.
- Fleet automation helpers `runBulkRepoTask`, `validateEnv`, and `detectDrift`.
- New package exports (`security`, `dx`, `release`, `operations`, `automation`) for tree-shakable imports.
# Changelog

## 1.0.0

- Added `add-ai-tokens` interactive helper to capture OpenAI, Anthropic Claude, Google Gemini, and DeepSeek keys into `~/.kitiumai/ai-tokens.json`.
- Hardened npm auth setup: `add-npmrc` now prompts for a token (no hardcoded defaults) and saves to local/user `.npmrc`.
- General scripts toolkit improvements for security and publish readiness.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-11-20

### Added

- Initial release of @kitiumai/scripts
- **Build Utilities**:
  - `buildTypescript()` - TypeScript compilation with options
  - `typeCheck()` - Type checking without emitting
  - `cleanBuild()` - Clean build artifacts
  - `buildWatch()` - Watch mode for development
  - `buildAll()` - Complete build pipeline

- **Test Utilities**:
  - `runTests()` - Execute unit tests
  - `runTestsCoverage()` - Generate coverage reports
  - `watchTests()` - Test watch mode
  - `findTestFiles()` - Discover test files
  - `validateTests()` - Validate test setup

- **Lint & Format Utilities**:
  - `runEslint()` - ESLint integration
  - `checkFormat()` - Prettier format checking
  - `fixFormat()` - Auto-fix formatting issues
  - `lintAll()` - Run all lint checks
  - `watchLint()` - Lint watch mode
  - `generateLintReport()` - Generate JSON reports

- **Git Utilities**:
  - `getCurrentBranch()` - Get current branch name
  - `isWorkingDirectoryClean()` - Check for uncommitted changes
  - `getChangedFiles()` - List changed files
  - `stageFiles()` - Stage files for commit
  - `commit()` - Create commits
  - `push()` - Push to remote
  - `pull()` - Pull from remote
  - `createBranch()` - Create new branches
  - `switchBranch()` - Switch branches
  - `listBranches()` - List all branches
  - `getStatus()` - Get git status
  - `listTags()` - List git tags
  - `createTag()` - Create new tags

- **Core Utilities**:
  - `exec()` - Execute shell commands
  - `pathExists()` - Check file/directory existence
  - `readJson()` - Read JSON files
  - `writeJson()` - Write JSON files
  - `findFiles()` - Find files by pattern
  - `getProjectRoot()` - Get project root directory
  - `getRelativePath()` - Get relative paths
  - `log()` - Structured logging
  - `getEnv()` - Environment variable handling
  - `measure()` - Performance measurement

- Configuration files:
  - `tsconfig.json` - Strict TypeScript configuration
  - `.eslintrc.json` - ESLint rules
  - `.prettierrc.json` - Prettier formatting rules
  - `.gitignore` - Git ignore patterns
  - `.npmignore` - NPM ignore patterns

- Documentation:
  - Comprehensive README.md with examples
  - Full API reference
  - Enterprise standards documentation
  - Setup and usage guides

### Features

- Full TypeScript support with strict mode
- ESM module support
- Type-safe APIs with full type definitions
- Zero external dependencies
- Comprehensive error handling
- Proper exit codes and error reporting
- Extensible design
- Production-ready utilities
- Enterprise-grade standards
