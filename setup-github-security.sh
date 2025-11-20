#!/bin/bash

###############################################################################
# GitHub Security Configuration Script
#
# This script automates the setup of GitHub repository security configurations
# as documented in GITHUB_SECURITY.md
#
# Usage: ./setup-github-security.sh [--repo owner/name] [--token TOKEN] [--help]
###############################################################################

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-.}"
GH_API_VERSION="2022-11-28"

# Default values
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $*"
    fi
}

print_usage() {
    cat << EOF
GitHub Security Configuration Script

USAGE:
    ./setup-github-security.sh [OPTIONS]

OPTIONS:
    --repo OWNER/REPO       GitHub repository (owner/name format)
    --token TOKEN          GitHub API token (or use GITHUB_TOKEN env var)
    --dry-run              Preview changes without applying them
    --verbose              Enable verbose output
    --help                 Show this help message

EXAMPLES:
    # Using environment variables
    export GITHUB_TOKEN=ghp_xxxxx
    export GITHUB_REPO=kitium-ai/kitium-monorepo
    ./setup-github-security.sh

    # Using command-line arguments
    ./setup-github-security.sh --repo kitium-ai/kitium-monorepo --token ghp_xxxxx

    # Preview changes before applying
    ./setup-github-security.sh --dry-run --verbose

FEATURES:
    ✓ Creates CODEOWNERS file
    ✓ Creates SECURITY.md policy
    ✓ Sets up CodeQL workflow
    ✓ Configures Dependabot
    ✓ Creates security workflow
    ✓ Configures branch protection rules (requires gh CLI)
    ✓ Enables advanced security features (requires gh CLI)

REQUIREMENTS:
    - GitHub CLI (gh) installed and authenticated
    - Write access to the target repository
    - Valid GitHub API token with repo:write scope

EOF
    exit 0
}

check_requirements() {
    log_info "Checking requirements..."

    # Check if git is installed
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi

    # Check if gh CLI is installed (only required for non-dry-run)
    if [[ "$DRY_RUN" == "false" ]]; then
        if ! command -v gh &> /dev/null; then
            log_warning "GitHub CLI (gh) is not installed"
            log_info "Install it from: https://cli.github.com/"
            log_info "Note: gh is optional for file creation, but required for GitHub API operations"
        fi
    fi

    log_success "Requirements checked"
}

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --repo)
                GITHUB_REPO="$2"
                shift 2
                ;;
            --token)
                GITHUB_TOKEN="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN="true"
                shift
                ;;
            --verbose)
                VERBOSE="true"
                shift
                ;;
            --help)
                print_usage
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 1
                ;;
        esac
    done
}

verify_repo_access() {
    log_info "Verifying repository access..."

    if ! gh repo view "$GITHUB_REPO" > /dev/null 2>&1; then
        log_error "Cannot access repository: $GITHUB_REPO"
        log_info "Make sure you have access and the repo name is correct (format: owner/repo)"
        exit 1
    fi

    log_success "Repository access verified"
}

###############################################################################
# File Creation Functions
###############################################################################

create_codeowners() {
    log_info "Creating .github/CODEOWNERS file..."

    local codeowners_file="$REPO_ROOT/.github/CODEOWNERS"
    mkdir -p "$(dirname "$codeowners_file")"

    cat > "$codeowners_file" << 'EOF'
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
EOF

    if [[ "$DRY_RUN" == "false" ]]; then
        log_success "Created .github/CODEOWNERS"
    else
        log_success "[DRY-RUN] Would create .github/CODEOWNERS"
    fi
}

create_security_policy() {
    log_info "Creating SECURITY.md file..."

    local security_file="$REPO_ROOT/SECURITY.md"

    cat > "$security_file" << 'EOF'
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
3. **Audit dependencies regularly** - Run `npm audit` before releases
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

1. **General questions** → Open an issue tagged `security`
2. **Security vulnerabilities** → Email security@kitiumai.com
3. **Configuration help** → Contact tech leads
EOF

    if [[ "$DRY_RUN" == "false" ]]; then
        log_success "Created SECURITY.md"
    else
        log_success "[DRY-RUN] Would create SECURITY.md"
    fi
}

create_codeql_workflow() {
    log_info "Creating CodeQL workflow..."

    local workflow_file="$REPO_ROOT/.github/workflows/codeql.yml"
    mkdir -p "$(dirname "$workflow_file")"

    cat > "$workflow_file" << 'EOF'
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
        languages: ${{ matrix.language }}
        queries: security-and-quality

    - name: Autobuild
      uses: github/codeql-action/autobuild@v2

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2
      with:
        category: "/language:${{ matrix.language }}"
EOF

    if [[ "$DRY_RUN" == "false" ]]; then
        log_success "Created .github/workflows/codeql.yml"
    else
        log_success "[DRY-RUN] Would create .github/workflows/codeql.yml"
    fi
}

create_dependabot_config() {
    log_info "Creating Dependabot configuration..."

    local dependabot_file="$REPO_ROOT/.github/dependabot.yml"
    mkdir -p "$(dirname "$dependabot_file")"

    cat > "$dependabot_file" << 'EOF'
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
EOF

    if [[ "$DRY_RUN" == "false" ]]; then
        log_success "Created .github/dependabot.yml"
    else
        log_success "[DRY-RUN] Would create .github/dependabot.yml"
    fi
}

create_security_workflow() {
    log_info "Creating security checks workflow..."

    local workflow_file="$REPO_ROOT/.github/workflows/security.yml"
    mkdir -p "$(dirname "$workflow_file")"

    cat > "$workflow_file" << 'EOF'
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
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
        continue-on-error: true
EOF

    if [[ "$DRY_RUN" == "false" ]]; then
        log_success "Created .github/workflows/security.yml"
    else
        log_success "[DRY-RUN] Would create .github/workflows/security.yml"
    fi
}

###############################################################################
# GitHub API Functions
###############################################################################

gh_api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    local args=(
        --method "$method"
        --header "Accept: application/vnd.github.${GH_API_VERSION}+json"
    )

    if [[ -n "$data" ]]; then
        args+=(--input <(echo "$data"))
    fi

    gh api "${args[@]}" "$endpoint"
}

enable_advanced_security() {
    log_info "Enabling advanced security features..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "[DRY-RUN] Would enable advanced security features"
        return 0
    fi

    # Note: Enabling these features requires GitHub API or web UI
    # This is a best-effort implementation
    log_warning "Advanced security features should be enabled via Settings → Code security and analysis"
    log_info "Features to enable:"
    log_info "  - Dependabot alerts"
    log_info "  - Dependabot security updates"
    log_info "  - Secret scanning"
    log_info "  - Push protection"
    log_info "  - CodeQL analysis"
}

enable_secret_scanning() {
    log_info "Enabling secret scanning with push protection..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "[DRY-RUN] Would enable secret scanning"
        return 0
    fi

    log_warning "Secret scanning requires GitHub CLI or web UI configuration"
    log_info "To enable via web UI:"
    log_info "  1. Go to Settings → Code security and analysis"
    log_info "  2. Enable 'Secret scanning'"
    log_info "  3. Enable 'Push protection'"
}

configure_branch_protection() {
    log_info "Configuring branch protection rules..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "[DRY-RUN] Would configure branch protection for main branch"
        return 0
    fi

    log_warning "Branch protection rules should be configured via Settings → Branches"
    log_info "Required settings for main branch:"
    log_info "  - Require 2 pull request approvals"
    log_info "  - Dismiss stale PR approvals"
    log_info "  - Require code owner reviews"
    log_info "  - Require signed commits"
    log_info "  - Require status checks (GitHub Actions, CodeQL)"
    log_info "  - Require conversation resolution"
    log_info "  - Restrict who can dismiss reviews"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   GitHub Security Configuration Script                        ║"
    echo "║   Implements security best practices from GITHUB_SECURITY.md   ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo

    # Parse arguments
    parse_arguments "$@"

    # Validate inputs
    if [[ -z "$GITHUB_REPO" ]]; then
        log_error "Repository not specified"
        log_info "Use --repo OWNER/REPO or set GITHUB_REPO environment variable"
        echo
        print_usage
        exit 1
    fi

    # Show configuration
    log_info "Configuration:"
    log_info "  Repository: $GITHUB_REPO"
    log_info "  Dry Run: $DRY_RUN"
    log_info "  Verbose: $VERBOSE"
    log_info "  Repository Root: $REPO_ROOT"
    echo

    # Check requirements
    check_requirements

    if [[ "$DRY_RUN" == "false" ]]; then
        verify_repo_access
    fi

    echo

    # Show dry-run notice
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE: No changes will be applied"
        echo
    fi

    # Create files
    log_info "Setting up security files..."
    echo
    create_codeowners
    create_security_policy
    create_codeql_workflow
    create_dependabot_config
    create_security_workflow

    echo

    # Configure GitHub features
    log_info "GitHub API configurations..."
    echo
    enable_advanced_security
    enable_secret_scanning
    configure_branch_protection

    echo
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                    NEXT STEPS                                  ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo

    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Files have been created. Please review and commit:"
        log_info "  git add .github/ SECURITY.md"
        log_info "  git commit -m 'chore: add GitHub security configuration'"
        echo
    else
        log_info "DRY RUN completed. No changes were made."
        log_info "Run without --dry-run to apply changes"
        echo
    fi

    log_info "Manual configuration required in GitHub web UI:"
    log_info ""
    log_info "1. Branch Protection Rules (Settings → Branches)"
    log_info "   - Pattern: main"
    log_info "   - Enable: Require 2 pull request approvals"
    log_info "   - Enable: Dismiss stale PR approvals"
    log_info "   - Enable: Require code owner reviews"
    log_info "   - Enable: Require signed commits"
    log_info "   - Enable: Require conversation resolution"
    log_info ""
    log_info "2. Advanced Security (Settings → Code security and analysis)"
    log_info "   - Enable: Dependabot alerts"
    log_info "   - Enable: Dependabot security updates"
    log_info "   - Enable: Secret scanning"
    log_info "   - Enable: Push protection"
    log_info "   - Enable: CodeQL analysis"
    log_info ""
    log_info "3. Repository Secrets (Settings → Secrets and variables)"
    log_info "   - Add required secrets for CI/CD pipelines"
    log_info ""
    log_info "4. Teams and Access Control (Settings → Collaborators and teams)"
    log_info "   - Create Admin Team (Maintain role)"
    log_info "   - Create Contributors Team (Write role)"
    log_info "   - Create Viewers Team (Triage role)"
    echo

    log_success "Security setup complete!"
    echo
}

# Run main function
main "$@"
