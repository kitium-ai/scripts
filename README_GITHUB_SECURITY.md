# GitHub Security Configuration Scripts

Comprehensive automation for implementing GitHub repository security best practices across **Windows** (PowerShell), **macOS**, and **Linux** (Bash).

## 📚 Overview

These scripts automate the setup of GitHub security configurations as documented in `GITHUB_SECURITY.md`:

- **CODEOWNERS** file for code ownership tracking
- **SECURITY.md** policy document
- **CodeQL workflow** for code analysis
- **Dependabot configuration** for dependency management
- **Security checks workflow** for automated security scanning
- **Branch protection rules** (via GitHub API)
- **Advanced security features** (configuration guidance)

## 🎯 Quick Start

### Linux/macOS (Bash)

```bash
# Clone/navigate to repository
cd /path/to/repository

# Preview changes
./setup-github-security.sh --repo owner/repo --dry-run

# Apply changes
./setup-github-security.sh --repo owner/repo

# Configure branch protection (requires GitHub token)
export GITHUB_TOKEN=ghp_xxxxx
./configure-github-branch-protection.sh --repo owner/repo
```

### Windows (PowerShell)

```powershell
# Navigate to repository
cd C:\path\to\repository

# Preview changes
.\setup-github-security.ps1 -RepoName owner/repo -DryRun

# Apply changes
.\setup-github-security.ps1 -RepoName owner/repo

# Configure branch protection (requires GitHub token)
$env:GITHUB_TOKEN = "ghp_xxxxx"
.\configure-github-branch-protection.ps1 -RepoName owner/repo
```

## 📋 Available Scripts

### 1. `setup-github-security.sh` (Linux/macOS - Bash)

Main script that creates all security files and provides configuration guidance.

**Features:**
- Creates `.github/CODEOWNERS` file
- Creates `SECURITY.md` policy
- Creates `.github/workflows/codeql.yml`
- Creates `.github/dependabot.yml`
- Creates `.github/workflows/security.yml`
- Provides guidance for manual GitHub UI configurations

**Usage:**

```bash
./setup-github-security.sh --help
```

**Options:**
```
--repo OWNER/REPO     GitHub repository (owner/name format)
--token TOKEN        GitHub API token (or use GITHUB_TOKEN env var)
--dry-run            Preview changes without applying them
--verbose            Enable verbose output
--help              Show help message
```

**Examples:**
```bash
# Basic usage
export GITHUB_REPO=owner/repo
./setup-github-security.sh

# With arguments
./setup-github-security.sh --repo owner/repo --dry-run --verbose

# From different directory
/path/to/setup-github-security.sh --repo owner/repo
```

### 2. `setup-github-security.ps1` (Windows - PowerShell)

PowerShell equivalent of the bash script with native Windows compatibility.

**Features:**
- Same functionality as bash version
- Native PowerShell parameter handling
- Colored output using Write-Host
- Better error handling for Windows environment
- Support for PowerShell execution policies

**Usage:**

```powershell
Get-Help .\setup-github-security.ps1
```

**Parameters:**
```
-RepoName OWNER/REPO    GitHub repository (owner/name format)
-Token TOKEN           GitHub API token (or use GITHUB_TOKEN env var)
-DryRun               Preview changes without applying them
-Verbose              Enable verbose output
-RepoRoot PATH        Repository root directory (default: .)
```

**Examples:**
```powershell
# Basic usage
$env:GITHUB_REPO = "owner/repo"
.\setup-github-security.ps1

# With parameters
.\setup-github-security.ps1 -RepoName owner/repo -DryRun -Verbose

# From different directory
C:\path\to\setup-github-security.ps1 -RepoName owner/repo
```

**PowerShell Execution Policy:**

If you get an execution policy error, run:
```powershell
# For current user (recommended)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for single execution
powershell -ExecutionPolicy Bypass -File .\setup-github-security.ps1 -RepoName owner/repo
```

### 3. `configure-github-branch-protection.sh` (Linux/macOS - Bash)

Advanced script for configuring branch protection rules via GitHub API.

**Features:**
- Configures branch protection with 2 approval requirement
- Enforces code owner reviews and signed commits
- Prevents force pushes and deletions
- Requires conversation resolution before merge

**Usage:**

```bash
./configure-github-branch-protection.sh --help
```

**Options:**
```
--repo OWNER/REPO     GitHub repository
--branch BRANCH       Branch name (default: main)
--token TOKEN        GitHub API token
--dry-run            Preview changes
--verbose            Enable verbose logging
--help              Show help message
```

**Examples:**
```bash
# Basic usage with environment variable
export GITHUB_TOKEN=ghp_xxxxx
export GITHUB_REPO=owner/repo
./configure-github-branch-protection.sh

# With arguments
./configure-github-branch-protection.sh --repo owner/repo --token ghp_xxxxx --dry-run
```

### 4. `configure-github-branch-protection.ps1` (Windows - PowerShell)

PowerShell equivalent of the branch protection script.

**Parameters:**
```
-RepoName OWNER/REPO    GitHub repository
-Branch BRANCH          Branch name (default: main)
-Token TOKEN           GitHub API token
-DryRun               Preview changes
-Verbose              Enable verbose output
```

**Examples:**
```powershell
# Basic usage
$env:GITHUB_TOKEN = "ghp_xxxxx"
.\configure-github-branch-protection.ps1 -RepoName owner/repo

# With parameters
.\configure-github-branch-protection.ps1 -RepoName owner/repo -Branch main -DryRun -Verbose
```

## 🚀 Complete Setup Workflow

### Step 1: Create Security Files

**Bash:**
```bash
cd /path/to/repository
/path/to/setup-github-security.sh --repo kitium-ai/kitium-monorepo
```

**PowerShell:**
```powershell
cd C:\path\to\repository
C:\path\to\setup-github-security.ps1 -RepoName kitium-ai/kitium-monorepo
```

### Step 2: Review and Commit

```bash
# Check what was created
git status

# Review files
cat .github/CODEOWNERS
cat SECURITY.md

# Commit changes
git add .github/ SECURITY.md
git commit -m "chore: add GitHub security configuration"
git push origin main
```

### Step 3: Configure Branch Protection (API)

**Bash:**
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
/path/to/configure-github-branch-protection.sh --repo kitium-ai/kitium-monorepo
```

**PowerShell:**
```powershell
$env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxx"
C:\path\to\configure-github-branch-protection.ps1 -RepoName kitium-ai/kitium-monorepo
```

### Step 4: Manual GitHub UI Configuration

Complete these configurations in the GitHub web UI:

#### Settings → Code security and analysis

Enable:
- [ ] Dependabot alerts
- [ ] Dependabot security updates
- [ ] Secret scanning
- [ ] Push protection
- [ ] CodeQL analysis

#### Settings → Branches

Verify that branch protection rule for `main` includes:
- [x] Require 2 pull request approvals
- [x] Dismiss stale PR approvals
- [x] Require code owner reviews
- [x] Require signed commits
- [x] Require conversation resolution

#### Settings → Secrets and variables → Actions

Add required secrets:
- `NPM_TOKEN` - For publishing packages
- `SONARQUBE_TOKEN` - For code quality analysis
- `GH_TOKEN` - For GitHub API access
- Other CI/CD secrets as needed

#### Settings → Collaborators and teams

Create teams:
- **Admin Team** (Maintain role)
- **Contributors Team** (Write role)
- **Viewers Team** (Triage role)

## 🔧 Generated Files

### .github/CODEOWNERS

Defines code ownership by directory:

```
# Default owners
* @tech-leads @security-team

# Specific team ownership
/frontend/ @frontend-team
/backend/ @backend-team
/docs/ @documentation-team
```

Customize this file based on your team structure.

### SECURITY.md

Security policy including:
- Vulnerability reporting procedures
- Supported versions
- Security best practices for contributors and maintainers
- Security checklist for code reviewers
- OWASP Top 10 vulnerability guide

### .github/workflows/codeql.yml

Automated code scanning:
- Runs on push to `main` and `develop`
- Runs on PR to `main` and `develop`
- Weekly schedule (Sunday midnight UTC)
- Supports JavaScript and TypeScript

### .github/dependabot.yml

Automated dependency updates:
- **NPM**: Weekly updates (Monday 03:00 UTC)
- **GitHub Actions**: Weekly updates (Monday 04:00 UTC)
- Includes PR limits and reviewer assignments

### .github/workflows/security.yml

Security checks on every push/PR:
- `npm audit` - Vulnerable dependency detection
- TruffleHog - Secret scanning

## 🧪 Testing Scripts

### Dry-Run Mode

Always test changes with dry-run first:

**Bash:**
```bash
./setup-github-security.sh --repo owner/repo --dry-run --verbose
```

**PowerShell:**
```powershell
.\setup-github-security.ps1 -RepoName owner/repo -DryRun -Verbose
```

### Verification

After running scripts, verify the created files:

```bash
# List created files
ls -la .github/
ls -la SECURITY.md

# Check file contents
cat .github/CODEOWNERS
cat SECURITY.md
cat .github/dependabot.yml
```

## 🐛 Troubleshooting

### Bash Scripts

**"Cannot access repository" error**
```bash
# Check repository access
git ls-remote https://github.com/owner/repo.git HEAD
```

**"Permission denied" on script**
```bash
# Make script executable
chmod +x setup-github-security.sh
chmod +x configure-github-branch-protection.sh
```

**"Git not found" error**
```bash
# Install Git (macOS with Homebrew)
brew install git

# Install Git (Ubuntu/Debian)
sudo apt-get install git
```

### PowerShell Scripts

**"Cannot be loaded because running scripts is disabled" error**
```powershell
# Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for single run
powershell -ExecutionPolicy Bypass -File .\setup-github-security.ps1 -RepoName owner/repo
```

**"The term 'git' is not recognized" error**
```powershell
# Install Git from https://git-scm.com/download/win
# Or use Chocolatey
choco install git

# Or use Windows Package Manager
winget install --id Git.Git
```

**Character encoding issues**
```powershell
# Ensure UTF-8 encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
```

### API Configuration

**"GitHub token not provided" error**

**Bash:**
```bash
export GITHUB_TOKEN=ghp_xxxxx
./configure-github-branch-protection.sh --repo owner/repo
```

**PowerShell:**
```powershell
$env:GITHUB_TOKEN = "ghp_xxxxx"
.\configure-github-branch-protection.ps1 -RepoName owner/repo
```

**"API request failed" error**

Verify token has `repo:write` scope:
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Check that token has `repo` (full control of private repositories) scope
3. Regenerate token if needed

**Branch protection already exists**

If branch protection rule already exists, the script will attempt to update it. Check the response for conflicts.

## 📊 Workflows Created

### CodeQL Analysis
- **Triggers**: Push to main/develop, PR, weekly schedule
- **Runtime**: ~10-15 minutes
- **Languages**: JavaScript, TypeScript
- **Status check**: Required before merge

### Security Checks
- **Triggers**: Push to main/develop, PR
- **Components**:
  - `npm audit` - Checks for vulnerable dependencies
  - TruffleHog - Detects exposed secrets
- **Status check**: Can block merge if audit fails

### Dependabot Updates
- **npm**: Weekly (Monday 03:00 UTC)
- **GitHub Actions**: Weekly (Monday 04:00 UTC)
- **Auto-review**: Assigned to @tech-leads
- **Auto-labels**: `dependencies`

## 🔐 Security Best Practices

### For Developers

1. **Never commit secrets** - Use environment variables
2. **Review Dependabot PRs** - Check for breaking changes
3. **Enable 2FA** - GitHub account security
4. **Sign commits** - GPG commit signing
5. **Review PRs carefully** - Look for OWASP Top 10 vulnerabilities

### For Maintainers

1. **Review security reports within 48 hours**
2. **Address critical vulnerabilities immediately**
3. **Run `npm audit` before releases**
4. **Monitor secret scanning alerts**
5. **Test security fixes thoroughly**

## 📝 File Structure

```
/scripts/
├── setup-github-security.sh              # Bash setup script
├── setup-github-security.ps1             # PowerShell setup script
├── configure-github-branch-protection.sh # Bash branch protection
├── configure-github-branch-protection.ps1# PowerShell branch protection
├── GITHUB_SECURITY_SETUP.md             # Detailed documentation
└── README_GITHUB_SECURITY.md             # This file

/repository/
├── .github/
│   ├── CODEOWNERS                        # Code ownership
│   ├── dependabot.yml                    # Dependabot config
│   └── workflows/
│       ├── codeql.yml                    # CodeQL analysis
│       └── security.yml                  # Security checks
├── SECURITY.md                           # Security policy
└── ... (other files)
```

## 🔗 References

- [GITHUB_SECURITY.md](../GITHUB_SECURITY.md) - Full security documentation
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests)
- [GitHub Advanced Security](https://docs.github.com/en/code-security)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/)
- [OWASP Top 10](https://owasp.org/Top10/)

## 💡 Tips

- **Cross-Platform**: Use bash scripts on macOS/Linux, PowerShell scripts on Windows
- **CI Integration**: Can be integrated into CI/CD pipelines
- **Idempotent**: Safe to run multiple times
- **Customizable**: Edit generated files to match your team structure
- **Version Control**: Commit generated files for team visibility

## 🤝 Support

For issues or questions:

1. Review `SECURITY.md` in your repository
2. Check GitHub's documentation: https://docs.github.com/code-security
3. Report security issues: security@kitiumai.com

## 📄 License

These scripts are provided as-is for securing GitHub repositories.
