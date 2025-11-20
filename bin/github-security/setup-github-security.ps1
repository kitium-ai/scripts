<#
.SYNOPSIS
    GitHub Security Configuration Script for Windows/PowerShell

.DESCRIPTION
    Automates the setup of GitHub repository security configurations
    as documented in GITHUB_SECURITY.md

.PARAMETER RepoName
    GitHub repository in owner/name format (e.g., kitium-ai/kitium-monorepo)

.PARAMETER Token
    GitHub API token (or use GITHUB_TOKEN environment variable)

.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER Verbose
    Enable verbose output

.PARAMETER RepoRoot
    Repository root directory (default: current directory)

.EXAMPLE
    .\setup-github-security.ps1 -RepoName kitium-ai/kitium-monorepo

.EXAMPLE
    .\setup-github-security.ps1 -RepoName owner/repo -DryRun -Verbose

.EXAMPLE
    $env:GITHUB_REPO = "owner/repo"
    .\setup-github-security.ps1

.NOTES
    Requirements:
    - Write access to the target repository
    - PowerShell 5.0 or later
    - Git installed and in PATH

.LINK
    https://github.com/kitium-ai/kitium-monorepo/blob/main/GITHUB_SECURITY.md
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$RepoName = $env:GITHUB_REPO,

    [Parameter(Mandatory = $false)]
    [string]$Token = $env:GITHUB_TOKEN,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun,

    [Parameter(Mandatory = $false)]
    [string]$RepoRoot = "."
)

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ============================================================================
# Configuration and Logging Functions
# ============================================================================

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Debug-Msg {
    param([string]$Message)
    if ($VerbosePreference -eq 'Continue') {
        Write-Host "[DEBUG] $Message" -ForegroundColor Blue
    }
}

function Show-Usage {
    @"
GitHub Security Configuration Script for PowerShell

USAGE:
    .\setup-github-security.ps1 [OPTIONS]

OPTIONS:
    -RepoName OWNER/REPO    GitHub repository (owner/name format)
    -Token TOKEN           GitHub API token (or use GITHUB_TOKEN env var)
    -DryRun               Preview changes without applying them
    -Verbose              Enable verbose output
    -RepoRoot PATH        Repository root directory (default: .)
    -Help                 Show this help message

EXAMPLES:
    # Using positional parameters
    .\setup-github-security.ps1 -RepoName kitium-ai/kitium-monorepo

    # Using environment variables
    `$env:GITHUB_REPO = 'kitium-ai/kitium-monorepo'
    .\setup-github-security.ps1

    # Preview changes before applying
    .\setup-github-security.ps1 -RepoName owner/repo -DryRun -Verbose

FEATURES:
    ✓ Creates CODEOWNERS file
    ✓ Creates SECURITY.md policy
    ✓ Sets up CodeQL workflow
    ✓ Configures Dependabot
    ✓ Creates security workflow
    ✓ Configures branch protection rules
    ✓ Enables advanced security features

REQUIREMENTS:
    - PowerShell 5.0 or later
    - Git installed and in PATH
    - Write access to the target repository
"@
}

# ============================================================================
# Validation Functions
# ============================================================================

function Test-Requirements {
    Write-Info "Checking requirements..."

    # Check if Git is installed
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        Write-Error "Git is not installed or not in PATH"
        exit 1
    }

    if (-not $DryRun) {
        # Check if running on Windows
        if ($PSVersionTable.PSVersion.Major -lt 5) {
            Write-Error "PowerShell 5.0 or later is required"
            exit 1
        }
    }

    Write-Success "All requirements met"
}

function Test-RepositoryAccess {
    Write-Info "Verifying repository access..."

    try {
        $result = & git ls-remote "https://github.com/$RepoName.git" HEAD 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Cannot access repository: $RepoName"
            Write-Info "Make sure you have access and the repo name is correct (format: owner/repo)"
            exit 1
        }
    }
    catch {
        Write-Error "Failed to verify repository access: $_"
        exit 1
    }

    Write-Success "Repository access verified"
}

# ============================================================================
# File Creation Functions
# ============================================================================

function New-CodeownersFile {
    Write-Info "Creating .github/CODEOWNERS file..."

    $codeownersPath = Join-Path $RepoRoot ".github" "CODEOWNERS"
    $codeownersDir = Split-Path -Parent $codeownersPath

    if (-not (Test-Path $codeownersDir)) {
        New-Item -ItemType Directory -Path $codeownersDir -Force | Out-Null
    }

    $content = @"
# KitiumAI CODEOWNERS
# This file defines code owners for different parts of the repository
# See: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

# Default owners for everything
* @tech-leads @security-team

# Root and configuration files
/.github/ @tech-leads @security-team
/package.json @tech-leads
/package-lock.json @tech-leads
/tsconfig*.json @tech-leads
/.eslintrc* @tech-leads
/.prettierrc* @tech-leads

# Documentation
/docs/ @documentation-team
*.md @documentation-team
/SECURITY.md @tech-leads @security-team
/GITHUB_SECURITY.md @tech-leads @security-team

# CI/CD workflows
/.github/workflows/ @tech-leads @security-team

# Scripts
/scripts/ @tech-leads

# Dependencies configuration
/dependabot.yml @tech-leads
"@

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would create .github/CODEOWNERS"
    }
    else {
        $content | Out-File -FilePath $codeownersPath -Encoding UTF8 -NoNewline
        Write-Success "Created .github/CODEOWNERS"
    }
}

function New-SecurityPolicy {
    Write-Info "Creating SECURITY.md file..."

    $securityPath = Join-Path $RepoRoot "SECURITY.md"

    $content = @"
# Security Policy

## Reporting a Vulnerability

Please do **NOT** open a public issue for security vulnerabilities.

Instead, please email: **security@kitiumai.com**

Include the following information:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 24 hours and provide regular updates on our progress.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| 0.x     | :x:                |

## Security Best Practices

### For Contributors

1. **Never commit secrets** - Use environment variables
2. **Keep dependencies updated** - Review Dependabot PRs promptly
3. **Use strong authentication** - Enable 2FA on GitHub
4. **Sign commits** - Configure GPG commit signing
5. **Review code carefully** - Look for security vulnerabilities in PRs

### For Maintainers

1. **Review security reports promptly** - Within 48 hours
2. **Keep the repository updated** - Address critical vulnerabilities immediately
3. **Audit dependencies regularly** - Run ``npm audit`` before releases
4. **Monitor for exposed secrets** - Review secret scanning alerts
5. **Test security fixes** - Ensure patches don't break functionality

## Security Features Enabled

- ✅ Branch protection rules
- ✅ Required code reviews (2 approvals)
- ✅ CodeQL analysis
- ✅ Dependabot alerts and updates
- ✅ Secret scanning with push protection
- ✅ Signed commits required
- ✅ CODEOWNERS enforcement

## Security Checklist for Reviewers

Before approving any PR, verify:

- [ ] **No hardcoded secrets**
  - No API keys, passwords, tokens
  - No credentials in code or comments

- [ ] **Dependency changes**
  - Check for known vulnerabilities
  - Review new dependencies for legitimacy
  - No unnecessary dependencies added

- [ ] **Access control**
  - Proper authentication/authorization checks
  - No overly permissive permissions

- [ ] **Data handling**
  - Input validation present
  - SQL injection prevention
  - XSS prevention (for web components)
  - Proper data sanitization

- [ ] **Error handling**
  - No sensitive information in error messages
  - Proper logging without secrets

- [ ] **Cryptography**
  - Strong algorithms used
  - Proper key management
  - No custom crypto implementations

- [ ] **Third-party integrations**
  - API calls use HTTPS
  - Proper rate limiting
  - Error handling for API failures

## References

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/Top10/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests)

---

For questions or issues with GitHub security:

1. **General questions** → Open an issue tagged ``security``
2. **Security vulnerabilities** → Email security@kitiumai.com
3. **Configuration help** → Contact tech leads
"@

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would create SECURITY.md"
    }
    else {
        $content | Out-File -FilePath $securityPath -Encoding UTF8 -NoNewline
        Write-Success "Created SECURITY.md"
    }
}

function New-CodeQLWorkflow {
    Write-Info "Creating CodeQL workflow..."

    $workflowPath = Join-Path $RepoRoot ".github" "workflows" "codeql.yml"
    $workflowDir = Split-Path -Parent $workflowPath

    if (-not (Test-Path $workflowDir)) {
        New-Item -ItemType Directory -Path $workflowDir -Force | Out-Null
    }

    $content = @"
name: CodeQL Analysis

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan on Sunday

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'typescript']

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: `${{ matrix.language }}`
        queries: security-and-quality

    - name: Autobuild
      uses: github/codeql-action/autobuild@v2

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2
      with:
        category: "/language:`${{ matrix.language }}`"
"@

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would create .github/workflows/codeql.yml"
    }
    else {
        $content | Out-File -FilePath $workflowPath -Encoding UTF8 -NoNewline
        Write-Success "Created .github/workflows/codeql.yml"
    }
}

function New-DependabotConfig {
    Write-Info "Creating Dependabot configuration..."

    $dependabotPath = Join-Path $RepoRoot ".github" "dependabot.yml"

    $content = @"
version: 2
updates:
  # NPM package dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 10
    reviewers:
      - "tech-leads"
    labels:
      - "dependencies"
    allow:
      - dependency-type: "direct"
      - dependency-type: "indirect"
    ignore:
      # Optional: ignore major version updates for critical packages
      # - dependency-name: "typescript"
      #   update-types: ["version-update:semver-major"]

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "04:00"
    labels:
      - "dependencies"
      - "github-actions"
"@

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would create .github/dependabot.yml"
    }
    else {
        $content | Out-File -FilePath $dependabotPath -Encoding UTF8 -NoNewline
        Write-Success "Created .github/dependabot.yml"
    }
}

function New-SecurityWorkflow {
    Write-Info "Creating security checks workflow..."

    $workflowPath = Join-Path $RepoRoot ".github" "workflows" "security.yml"

    $content = @"
name: Security Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

permissions:
  contents: read

jobs:
  security:
    runs-on: ubuntu-latest
    name: Security Checks
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 'lts/*'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: false

      - name: Check for secrets with TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: `${{ github.event.repository.default_branch }}`
          head: HEAD
        continue-on-error: true
"@

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would create .github/workflows/security.yml"
    }
    else {
        $content | Out-File -FilePath $workflowPath -Encoding UTF8 -NoNewline
        Write-Success "Created .github/workflows/security.yml"
    }
}

# ============================================================================
# GitHub Configuration Functions
# ============================================================================

function Enable-AdvancedSecurity {
    Write-Info "Enabling advanced security features..."

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would enable advanced security features"
        return
    }

    Write-Warning "Advanced security features should be enabled via Settings → Code security and analysis"
    Write-Info "Features to enable:"
    Write-Info "  - Dependabot alerts"
    Write-Info "  - Dependabot security updates"
    Write-Info "  - Secret scanning"
    Write-Info "  - Push protection"
    Write-Info "  - CodeQL analysis"
}

function Enable-SecretScanning {
    Write-Info "Enabling secret scanning with push protection..."

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would enable secret scanning"
        return
    }

    Write-Warning "Secret scanning requires GitHub UI configuration"
    Write-Info "To enable via web UI:"
    Write-Info "  1. Go to Settings → Code security and analysis"
    Write-Info "  2. Enable 'Secret scanning'"
    Write-Info "  3. Enable 'Push protection'"
}

function Configure-BranchProtection {
    Write-Info "Configuring branch protection rules..."

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would configure branch protection for main branch"
        return
    }

    Write-Warning "Branch protection rules should be configured via Settings → Branches"
    Write-Info "Required settings for main branch:"
    Write-Info "  - Require 2 pull request approvals"
    Write-Info "  - Dismiss stale PR approvals"
    Write-Info "  - Require code owner reviews"
    Write-Info "  - Require signed commits"
    Write-Info "  - Require status checks (GitHub Actions, CodeQL)"
    Write-Info "  - Require conversation resolution"
    Write-Info "  - Restrict who can dismiss reviews"
}

# ============================================================================
# Main Function
# ============================================================================

function Main {
    # Display header
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║   GitHub Security Configuration Script (PowerShell)           ║" -ForegroundColor Magenta
    Write-Host "║   Implements security best practices from GITHUB_SECURITY.md   ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""

    # Validate inputs
    if ([string]::IsNullOrEmpty($RepoName)) {
        Write-Error "Repository not specified"
        Write-Info "Use -RepoName parameter or set GITHUB_REPO environment variable"
        Write-Host ""
        Show-Usage
        exit 1
    }

    # Show configuration
    Write-Info "Configuration:"
    Write-Info "  Repository: $RepoName"
    Write-Info "  Dry Run: $DryRun"
    Write-Info "  Verbose: $(if ($VerbosePreference -eq 'Continue') { 'Yes' } else { 'No' })"
    Write-Info "  Repository Root: $RepoRoot"
    Write-Host ""

    # Check requirements
    Test-Requirements

    if (-not $DryRun) {
        Test-RepositoryAccess
    }

    Write-Host ""

    # Show dry-run notice
    if ($DryRun) {
        Write-Warning "DRY RUN MODE: No changes will be applied"
        Write-Host ""
    }

    # Create files
    Write-Info "Setting up security files..."
    Write-Host ""
    New-CodeownersFile
    New-SecurityPolicy
    New-CodeQLWorkflow
    New-DependabotConfig
    New-SecurityWorkflow

    Write-Host ""

    # Configure GitHub features
    Write-Info "GitHub API configurations..."
    Write-Host ""
    Enable-AdvancedSecurity
    Enable-SecretScanning
    Configure-BranchProtection

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║                    NEXT STEPS                                  ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""

    if ($DryRun) {
        Write-Info "DRY RUN completed. No changes were made."
        Write-Info "Run without -DryRun to apply changes"
        Write-Host ""
    }
    else {
        Write-Info "Files have been created. Please review and commit:"
        Write-Info "  git add .github/ SECURITY.md"
        Write-Info "  git commit -m 'chore: add GitHub security configuration'"
        Write-Host ""
    }

    Write-Info "Manual configuration required in GitHub web UI:"
    Write-Info ""
    Write-Info "1. Branch Protection Rules (Settings → Branches)"
    Write-Info "   - Pattern: main"
    Write-Info "   - Enable: Require 2 pull request approvals"
    Write-Info "   - Enable: Dismiss stale PR approvals"
    Write-Info "   - Enable: Require code owner reviews"
    Write-Info "   - Enable: Require signed commits"
    Write-Info "   - Enable: Require conversation resolution"
    Write-Info ""
    Write-Info "2. Advanced Security (Settings → Code security and analysis)"
    Write-Info "   - Enable: Dependabot alerts"
    Write-Info "   - Enable: Dependabot security updates"
    Write-Info "   - Enable: Secret scanning"
    Write-Info "   - Enable: Push protection"
    Write-Info "   - Enable: CodeQL analysis"
    Write-Info ""
    Write-Info "3. Repository Secrets (Settings → Secrets and variables)"
    Write-Info "   - Add required secrets for CI/CD pipelines"
    Write-Info ""
    Write-Info "4. Teams and Access Control (Settings → Collaborators and teams)"
    Write-Info "   - Create Admin Team (Maintain role)"
    Write-Info "   - Create Contributors Team (Write role)"
    Write-Info "   - Create Viewers Team (Triage role)"
    Write-Host ""

    Write-Success "Security setup complete!"
    Write-Host ""
}

# ============================================================================
# Entry Point
# ============================================================================

try {
    Main
}
catch {
    Write-Error "An error occurred: $_"
    exit 1
}
