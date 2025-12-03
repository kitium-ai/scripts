# Contributing to @kitiumai/scripts

Thank you for your interest in contributing! This document provides guidelines and workflows for contributing to the `@kitiumai/scripts` package.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Testing Requirements](#testing-requirements)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and constructive
- Assume good faith and intent
- Focus on what's best for the community
- Accept feedback gracefully
- Report unacceptable behavior to conduct@kitiumai.com

## Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0 (LTS recommended)
- **pnpm**: >= 8.0.0 (package manager)
- **Git**: >= 2.30.0

### Initial Setup

1. **Fork and Clone**

```bash
git clone https://github.com/YOUR_USERNAME/kitiumai-monorepo.git
cd kitiumai-monorepo/tooling/scripts
```

2. **Install Dependencies**

```bash
pnpm install --ignore-workspace
```

3. **Verify Setup**

```bash
pnpm run build
pnpm run test
```

If all tests pass, you're ready to contribute!

## Development Setup

### IDE Configuration

We recommend **VS Code** with these extensions:

- ESLint (dbaeumer.vscode-eslint)
- Prettier (esbenp.prettier-vscode)
- TypeScript (ms-vscode.vscode-typescript-next)
- Vitest (vitest.explorer)

### Environment Variables

Create a `.env` file for local development:

```env
# AI Provider Tokens (optional for AI module testing)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...
DEEPSEEK_API_KEY=...

# Development settings
NODE_ENV=development
LOG_LEVEL=debug
```

**Important**: Never commit `.env` files!

## Development Workflow

### Branch Strategy

- **main**: Production-ready code
- **develop**: Integration branch
- **feature/**: New features
- **fix/**: Bug fixes
- **docs/**: Documentation updates
- **refactor/**: Code improvements

### Creating a Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes

**Examples**:

```bash
git commit -m "feat(git): add support for signed commits"
git commit -m "fix(security): resolve Gitleaks false positive"
git commit -m "docs(api): add JSDoc for exec function"
git commit -m "test(utils): increase coverage for pathExists"
```

### Making Changes

1. **Write Tests First** (TDD approach):

```typescript
// test/my-feature.test.ts
import { describe, it, expect } from 'vitest';
import { myNewFunction } from '../src/my-module';

describe('myNewFunction', () => {
  it('should handle basic case', () => {
    expect(myNewFunction('input')).toBe('expected');
  });
});
```

2. **Implement Feature**:

```typescript
// src/my-module/index.ts
/**
 * Brief description of what the function does.
 * 
 * @param input - Description of parameter
 * @returns Description of return value
 * @throws {ValidationError} When input is invalid
 * 
 * @example
 * ```typescript
 * const result = myNewFunction('example');
 * console.log(result); // 'expected'
 * ```
 */
export function myNewFunction(input: string): string {
  // implementation
}
```

3. **Run Quality Checks**:

```bash
# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Tests
pnpm run test

# Coverage
pnpm run test:coverage
```

## Testing Requirements

### Coverage Requirements

All contributions must maintain **>80% coverage**:

- **Branches**: >= 80%
- **Functions**: >= 80%
- **Lines**: >= 80%
- **Statements**: >= 80%

### Writing Tests

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  describe('myFunction', () => {
    it('should handle success case', async () => {
      const result = await myFunction('valid-input');
      expect(result).toBe('expected-output');
    });

    it('should handle error case', async () => {
      await expect(myFunction('invalid')).rejects.toThrow(ValidationError);
    });

    it('should handle edge cases', () => {
      expect(myFunction('')).toBe('');
      expect(myFunction(null)).toBeUndefined();
    });
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm run test

# Watch mode (TDD)
pnpm run test:watch

# Coverage report
pnpm run test:coverage

# UI mode (visual test runner)
pnpm run test:ui
```

## Code Standards

### TypeScript

- Use **strict mode** (enabled in tsconfig.json)
- Prefer `interface` over `type` for object shapes
- Use explicit return types for public functions
- Avoid `any` (use `unknown` if truly dynamic)

### Code Style

We use **Prettier** and **ESLint**:

```bash
# Check formatting
pnpm run format:check

# Auto-fix formatting
pnpm run format:write

# Lint code
pnpm run lint
```

### Documentation

Every public API must have JSDoc:

```typescript
/**
 * Execute a shell command with proper error handling.
 * 
 * @param command - The command to execute
 * @param args - Command arguments (safely escaped)
 * @param options - Execution options
 * @returns Promise resolving to execution result
 * 
 * @throws {CommandError} When command fails or times out
 * 
 * @example
 * ```typescript
 * const result = await exec('git', ['status'], { cwd: '/repo' });
 * console.log(result.stdout);
 * ```
 * 
 * @public
 */
export async function exec(
  command: string,
  args: string[],
  options?: ExecOptions
): Promise<ExecResult> {
  // implementation
}
```

### Error Handling

Use custom error classes from `@kitiumai/scripts/types`:

```typescript
import { CommandError, ValidationError } from '@kitiumai/scripts/types';

// Validation errors
if (!isValid(input)) {
  throw new ValidationError('Invalid input', 'email', input);
}

// Command errors
if (result.exitCode !== 0) {
  throw new CommandError('Command failed', command, result.stderr, result.exitCode);
}
```

## Pull Request Process

### Before Submitting

1. **Ensure all checks pass**:
   ```bash
   pnpm run type-check
   pnpm run lint
   pnpm run test:coverage
   pnpm run build
   ```

2. **Update documentation**:
   - Add JSDoc to new functions
   - Update README.md if needed
   - Update API.md for public APIs

3. **Write tests**:
   - Unit tests for new features
   - Integration tests for complex workflows
   - Maintain >80% coverage

### Creating a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open PR** on GitHub with:
   - **Title**: Clear, descriptive (follows conventional commits)
   - **Description**: What changed and why
   - **Related Issues**: Link to issues (Fixes #123)
   - **Testing**: How you tested changes
   - **Breaking Changes**: If any

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] Coverage >= 80%

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review performed
- [ ] Comments added to complex code
- [ ] Documentation updated
- [ ] No new warnings
- [ ] Tests pass locally
- [ ] Dependent changes merged
```

### Review Process

- **Automated Checks**: CI must pass (type-check, lint, test, security)
- **Code Review**: At least 1 approving review required
- **Coverage**: Must maintain >80% coverage
- **Documentation**: Public APIs must be documented

### After Approval

Maintainers will:
1. Merge to `develop` branch
2. Include in next release
3. Update changelog
4. Tag contributors

## Release Process

Releases are handled by maintainers:

1. **Version Bump**: Semantic versioning (major.minor.patch)
2. **Changelog**: Auto-generated from conventional commits
3. **Publish**: To npm registry
4. **GitHub Release**: With release notes and SBOM

### Versioning

- **Major**: Breaking changes (2.0.0)
- **Minor**: New features (1.1.0)
- **Patch**: Bug fixes (1.0.1)

## Community

### Questions?

- **GitHub Discussions**: Ask questions, share ideas
- **GitHub Issues**: Bug reports, feature requests
- **Email**: dev@kitiumai.com

### Recognition

Contributors are recognized in:
- CHANGELOG.md for releases
- README.md contributors section
- GitHub contributors page

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to @kitiumai/scripts!** 🚀
