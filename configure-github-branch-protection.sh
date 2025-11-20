#!/bin/bash

###############################################################################
# GitHub Branch Protection Configuration Script
#
# This script configures branch protection rules using the GitHub API
# Complements setup-github-security.sh for advanced configurations
#
# Usage: ./configure-github-branch-protection.sh --repo owner/repo --branch main [--token TOKEN]
###############################################################################

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
GITHUB_REPO="${GITHUB_REPO:-}"
BRANCH="main"
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
GitHub Branch Protection Configuration Script

USAGE:
    ./configure-github-branch-protection.sh [OPTIONS]

OPTIONS:
    --repo OWNER/REPO       GitHub repository (owner/name format)
    --branch BRANCH         Branch name (default: main)
    --token TOKEN          GitHub API token (or use GITHUB_TOKEN env var)
    --dry-run              Preview changes without applying them
    --verbose              Enable verbose output
    --help                 Show this help message

EXAMPLES:
    export GITHUB_TOKEN=ghp_xxxxx
    ./configure-github-branch-protection.sh --repo kitium-ai/kitium-monorepo

    ./configure-github-branch-protection.sh --repo owner/repo --branch main --dry-run

REQUIREMENTS:
    - GitHub API token with repo:write scope
    - Administrator access to the repository

CONFIGURATIONS APPLIED:
    ✓ Require 2 pull request approvals
    ✓ Dismiss stale PR approvals when new commits pushed
    ✓ Require code owner reviews
    ✓ Require signed commits
    ✓ Require conversation resolution
    ✓ Require branches up to date before merging
    ✓ Disable force pushes
    ✓ Disable deletions

EOF
    exit 0
}

check_requirements() {
    log_info "Checking requirements..."

    if [[ -z "$GITHUB_TOKEN" ]]; then
        log_error "GitHub token not provided"
        log_info "Set GITHUB_TOKEN environment variable or use --token option"
        exit 1
    fi

    if [[ -z "$GITHUB_REPO" ]]; then
        log_error "Repository not specified"
        exit 1
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
            --branch)
                BRANCH="$2"
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

###############################################################################
# GitHub API Functions
###############################################################################

gh_api_put() {
    local endpoint="$1"
    local data="$2"

    if [[ "$DRY_RUN" == "true" ]]; then
        log_debug "DRY-RUN: PUT $endpoint"
        if [[ -n "$data" ]]; then
            log_debug "Data: $data"
        fi
        return 0
    fi

    local response
    response=$(curl -s -X PUT \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -d "$data" \
        "https://api.github.com$endpoint")

    log_debug "Response: $response"

    # Check for errors
    if echo "$response" | grep -q '"message"'; then
        local message
        message=$(echo "$response" | grep -o '"message":"[^"]*' | sed 's/"message":"//' | head -1)
        log_error "API Error: $message"
        return 1
    fi

    return 0
}

configure_branch_protection() {
    log_info "Configuring branch protection for '$BRANCH' branch..."

    local endpoint="/repos/$GITHUB_REPO/branches/$BRANCH/protection"

    local required_status_checks
    required_status_checks=$(cat <<'EOF'
{
  "strict": true,
  "contexts": [
    "GitHub Actions",
    "CodeQL"
  ]
}
EOF
    )

    local payload
    payload=$(cat <<EOF
{
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": true,
    "required_approving_review_count": 2
  },
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "GitHub Actions",
      "CodeQL"
    ]
  },
  "enforce_admins": true,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "restrictions": null,
  "require_conversation_resolution": true,
  "require_signed_commits": true
}
EOF
    )

    log_debug "Payload: $payload"

    if ! gh_api_put "$endpoint" "$payload"; then
        log_error "Failed to configure branch protection"
        return 1
    fi

    log_success "Branch protection configured for '$BRANCH'"
}

enable_advanced_security_features() {
    log_info "Checking advanced security features..."

    if [[ "$DRY_RUN" == "true" ]]; then
        log_success "[DRY-RUN] Would enable advanced security features"
        return 0
    fi

    # Note: These features require specific GitHub plan and must be enabled via web UI
    # This is informational only
    log_warning "Advanced security features require GitHub Advanced Security"
    log_info "To enable manually:"
    log_info "  1. Go to Settings → Code security and analysis"
    log_info "  2. Enable Dependabot alerts"
    log_info "  3. Enable Dependabot security updates"
    log_info "  4. Enable Secret scanning"
    log_info "  5. Enable Push protection"
    log_info "  6. Enable CodeQL analysis"
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║   GitHub Branch Protection Configuration                       ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo

    # Parse arguments
    parse_arguments "$@"

    # Check requirements
    check_requirements

    # Show configuration
    log_info "Configuration:"
    log_info "  Repository: $GITHUB_REPO"
    log_info "  Branch: $BRANCH"
    log_info "  Dry Run: $DRY_RUN"
    echo

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN MODE: No changes will be applied"
        echo
    fi

    # Configure branch protection
    configure_branch_protection

    # Check advanced security
    enable_advanced_security_features

    echo
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                         SUMMARY                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo

    if [[ "$DRY_RUN" == "false" ]]; then
        log_success "Branch protection configured!"
        log_info "Settings applied:"
        log_info "  ✓ Require 2 pull request approvals"
        log_info "  ✓ Dismiss stale PR approvals"
        log_info "  ✓ Require code owner reviews"
        log_info "  ✓ Require signed commits"
        log_info "  ✓ Require conversation resolution"
        log_info "  ✓ Prevent force pushes"
        log_info "  ✓ Prevent branch deletion"
    else
        log_info "DRY RUN: No changes were applied"
        log_info "Run without --dry-run to apply configurations"
    fi

    echo
}

# Run main function
main "$@"
