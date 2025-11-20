# GitHub Security Setup Scripts

Automated scripts to implement GitHub repository security best practices as documented in `GITHUB_SECURITY.md`.

## Overview

These scripts automate the setup of GitHub security configurations including:

- **CODEOWNERS** file for code ownership tracking
- **SECURITY.md** policy document
- **CodeQL workflow** for code analysis
- **Dependabot configuration** for dependency management
- **Security checks workflow** for automated security scanning
- **Branch protection rules** (via GitHub API)
- **Advanced security features** (configuration guide)

## Scripts

### 1. `setup-github-security.sh`

Main script that creates security files and provides configuration guidance.

**Features:**
- Creates `.github/CODEOWNERS` file
- Creates `SECURITY.md` policy
- Creates `.github/workflows/codeql.yml`
- Creates `.github/dependabot.yml`
- Creates `.github/workflows/security.yml`
- Provides guidance for manual GitHub UI configurations

**Usage:**

```bash
# Basic usage (uses GITHUB_REPO env var)
export GITHUB_REPO=owner/repository
./setup-github-security.sh

# With command-line arguments
./setup-github-security.sh --repo owner/repository

# Dry run (preview changes)
./setup-github-security.sh --repo owner/repository --dry-run

# Verbose output
./setup-github-security.sh --repo owner/repository --verbose
```

**Options:**
- `--repo OWNER/REPO` - Target repository (format: owner/name)
- `--token TOKEN` - GitHub API token (or use GITHUB_TOKEN env var)
- `--dry-run` - Preview changes without applying them
- `--verbose` - Enable verbose logging
- `--help` - Show help message

**Requirements:**
- Write access to the target repository
- GitHub CLI (gh) installed and authenticated

### 2. `configure-github-branch-protection.sh`

Advanced script for configuring branch protection rules via GitHub API.

**Features:**
- Configures branch protection for specified branch
- Requires 2 pull request approvals
- Enables stale PR approval dismissal
- Enforces code owner reviews
- Requires signed commits
- Requires conversation resolution
- Prevents force pushes and deletions

**Usage:**

```bash
# Basic usage
export GITHUB_TOKEN=ghp_xxxxx
export GITHUB_REPO=owner/repository
./configure-github-branch-protection.sh

# With command-line arguments
./configure-github-branch-protection.sh --repo owner/repository --token ghp_xxxxx

# Dry run
./configure-github-branch-protection.sh --repo owner/repository --dry-run --verbose
```

**Options:**
- `--repo OWNER/REPO` - Target repository
- `--branch BRANCH` - Branch name (default: main)
- `--token TOKEN` - GitHub API token
- `--dry-run` - Preview changes
- `--verbose` - Enable verbose logging
- `--help` - Show help message

**Requirements:**
- GitHub API token with `repo:write` scope
- Administrator access to the repository

## Quick Start

### Step 1: Setup Security Files

```bash
# Clone the repository
cd /path/to/repository

# Run the main setup script
/path/to/setup-github-security.sh --repo owner/repository --dry-run

# Review changes, then run without --dry-run
/path/to/setup-github-security.sh --repo owner/repository
```

### Step 2: Commit Changes

```bash
git add .github/ SECURITY.md
git commit -m "chore: add GitHub security configuration"
git push origin main
```

### Step 3: Configure Branch Protection (API-based)

```bash
export GITHUB_TOKEN=ghp_xxxxx
/path/to/configure-github-branch-protection.sh --repo owner/repository
```

### Step 4: Manual GitHub UI Configuration

After running the scripts, complete these configurations in the GitHub web UI:

#### Settings → Code security and analysis

Enable:
- [ ] Dependabot alerts
- [ ] Dependabot security updates
- [ ] Secret scanning
- [ ] Push protection
- [ ] CodeQL analysis

#### Settings → Collaborators and teams

Create teams:
- [ ] **Admin Team** (Maintain role) - Tech leads, security team
- [ ] **Contributors Team** (Write role) - Developers
- [ ] **Viewers Team** (Triage role) - QA, Product managers

#### Settings → Secrets and variables → Actions

Add required secrets:
- [ ] `NPM_TOKEN` - For publishing packages
- [ ] `SONARQUBE_TOKEN` - For code quality analysis
- [ ] `GH_TOKEN` - For GitHub API access
- [ ] Other CI/CD secrets as needed

#### Settings → Environments

Create environments:
- [ ] `development`
- [ ] `staging`
- [ ] `production`

## Configuration Details

### CODEOWNERS

The generated `.github/CODEOWNERS` file defines code ownership:

```
# Root and configuration files
/ @tech-leads @security-team

# Documentation
/docs/ @documentation-team
*.md @documentation-team
```

Customize this file based on your team structure.

### Branch Protection Rules

The configured branch protection for `main` includes:

| Setting | Value | Purpose |
|---------|-------|---------|
| Require PRs | 2 approvals | Code review quality |
| Stale review dismissal | Yes | Ensure fresh reviews on new commits |
| Code owner reviews | Yes | Enforce CODEOWNERS |
| Signed commits | Yes | Verify commit authenticity |
| Conversation resolution | Yes | Address all feedback |
| Up-to-date branches | Yes | Prevent outdated merges |
| Force pushes | Disabled | Prevent history rewriting |
| Deletions | Disabled | Prevent accidental deletion |

### CodeQL Workflow

Automatic code scanning on:
- Pushes to `main` and `develop`
- Pull requests to `main` and `develop`
- Weekly schedule (Sunday midnight UTC)

Supports: JavaScript and TypeScript

### Dependabot

Automatic dependency updates:
- **NPM**: Weekly updates (Monday 03:00 UTC)
- **GitHub Actions**: Weekly updates (Monday 04:00 UTC)

### Security Workflow

Runs on every push and PR:
- `npm audit` - Checks for vulnerable dependencies
- TruffleHog - Scans for exposed secrets

## Verification

### Check Files Created

```bash
# Verify all security files exist
ls -la .github/CODEOWNERS
ls -la .github/workflows/codeql.yml
ls -la .github/workflows/security.yml
ls -la .github/dependabot.yml
ls -la SECURITY.md
```

### Test Workflows

Workflows start running on next push/PR:

1. Go to **Actions** tab in GitHub
2. Look for:
   - CodeQL Analysis
   - Security Checks
3. Verify all checks pass

### Verify Branch Protection

In GitHub UI:

1. Go to **Settings** → **Branches**
2. Click on the `main` branch rule
3. Verify all settings are applied correctly

## Troubleshooting

### Script fails with "Cannot access repository"

**Solution:** Verify repository access:
```bash
gh repo view owner/repository
```

### Branch protection configuration fails

**Solution:** Check token permissions:
```bash
# Token needs: repo:write scope
# Must have admin access to the repository
```

### Workflows not triggering

**Solution:** Verify workflow syntax:
```bash
# Check workflow files for YAML errors
cat .github/workflows/codeql.yml
```

### Dependabot not creating PRs

**Solution:**
1. Verify `.github/dependabot.yml` exists
2. Check **Code security and analysis** settings
3. Enable "Dependabot alerts" and "Dependabot security updates"

## Advanced Configuration

### Customize CODEOWNERS

Edit `.github/CODEOWNERS` to match your team structure:

```
# Customize teams and assignments
/backend/ @backend-team
/frontend/ @frontend-team
/docs/ @documentation-team
```

### Add Status Checks to Branch Protection

Edit branch protection rule to add required status checks:

```
Status checks that must pass:
- GitHub Actions
- CodeQL
- Your custom CI checks
```

### Create Multiple Branch Rules

Create similar rules for `develop` and `staging`:

```bash
# For develop branch (1 approval)
# For staging branch (2 approvals)
```

## Maintenance

### Weekly

- [ ] Review Dependabot PRs
- [ ] Check CodeQL alerts
- [ ] Review security scan results

### Monthly

- [ ] Review audit logs
- [ ] Check secret scanning alerts
- [ ] Verify branch protection rules

### Quarterly

- [ ] Rotate secrets
- [ ] Update CODEOWNERS as needed
- [ ] Review and update SECURITY.md
- [ ] Audit team permissions

## References

- [GITHUB_SECURITY.md](../GITHUB_SECURITY.md) - Full security documentation
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests)
- [GitHub Advanced Security](https://docs.github.com/en/code-security)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/)

## Support

For issues or questions:

1. Review `SECURITY.md` in your repository
2. Check GitHub's documentation: https://docs.github.com/code-security
3. Report security issues: security@kitiumai.com

## License

These scripts are provided as-is for securing GitHub repositories.
