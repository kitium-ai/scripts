<#
.SYNOPSIS
    GitHub Branch Protection Configuration Script for Windows/PowerShell

.DESCRIPTION
    Configures branch protection rules using the GitHub API.
    Complements setup-github-security.ps1 for advanced configurations.

.PARAMETER RepoName
    GitHub repository in owner/name format (e.g., kitium-ai/kitium-monorepo)

.PARAMETER Branch
    Branch name to protect (default: main)

.PARAMETER Token
    GitHub API token (or use GITHUB_TOKEN environment variable)

.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER Verbose
    Enable verbose output

.EXAMPLE
    .\configure-github-branch-protection.ps1 -RepoName kitium-ai/kitium-monorepo -Token $token

.EXAMPLE
    $env:GITHUB_TOKEN = "ghp_xxxxx"
    .\configure-github-branch-protection.ps1 -RepoName owner/repo

.EXAMPLE
    .\configure-github-branch-protection.ps1 -RepoName owner/repo -Branch develop -DryRun -Verbose

.NOTES
    Requirements:
    - GitHub API token with repo:write scope
    - Administrator access to the repository
    - PowerShell 5.0 or later

.LINK
    https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$RepoName = $env:GITHUB_REPO,

    [Parameter(Mandatory = $false)]
    [string]$Branch = "main",

    [Parameter(Mandatory = $false)]
    [string]$Token = $env:GITHUB_TOKEN,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

# Enable strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Configuration
$GitHubApiVersion = "2022-11-28"
$GitHubApiUrl = "https://api.github.com"

# ============================================================================
# Logging Functions
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
GitHub Branch Protection Configuration Script (PowerShell)

USAGE:
    .\configure-github-branch-protection.ps1 [OPTIONS]

OPTIONS:
    -RepoName OWNER/REPO    GitHub repository (owner/name format)
    -Branch BRANCH          Branch name (default: main)
    -Token TOKEN           GitHub API token (or use GITHUB_TOKEN env var)
    -DryRun               Preview changes without applying them
    -Verbose              Enable verbose output
    -Help                 Show this help message

EXAMPLES:
    `$env:GITHUB_TOKEN = 'ghp_xxxxx'
    .\configure-github-branch-protection.ps1 -RepoName kitium-ai/kitium-monorepo

    .\configure-github-branch-protection.ps1 -RepoName owner/repo -Branch main -DryRun -Verbose

REQUIREMENTS:
    - GitHub API token with repo:write scope
    - Administrator access to the repository
    - PowerShell 5.0 or later

CONFIGURATIONS APPLIED:
    ✓ Require 2 pull request approvals
    ✓ Dismiss stale PR approvals when new commits pushed
    ✓ Require code owner reviews
    ✓ Require signed commits
    ✓ Require conversation resolution
    ✓ Require branches up to date before merging
    ✓ Disable force pushes
    ✓ Disable deletions
"@
}

# ============================================================================
# Validation Functions
# ============================================================================

function Test-Requirements {
    Write-Info "Checking requirements..."

    if ([string]::IsNullOrEmpty($Token)) {
        Write-Error "GitHub token not provided"
        Write-Info "Set GITHUB_TOKEN environment variable or use -Token parameter"
        exit 1
    }

    if ([string]::IsNullOrEmpty($RepoName)) {
        Write-Error "Repository not specified"
        exit 1
    }

    Write-Success "Requirements checked"
}

# ============================================================================
# GitHub API Functions
# ============================================================================

function Invoke-GitHubApi {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Method,

        [Parameter(Mandatory = $true)]
        [string]$Endpoint,

        [Parameter(Mandatory = $false)]
        [hashtable]$Body
    )

    Write-Debug-Msg "Preparing API request: $Method $Endpoint"

    $headers = @{
        "Authorization"      = "token $Token"
        "Accept"             = "application/vnd.github.$GitHubApiVersion+json"
        "Content-Type"       = "application/json"
        "X-GitHub-Api-Version" = $GitHubApiVersion
    }

    $params = @{
        Method  = $Method
        Headers = $headers
        Uri     = "$GitHubApiUrl$Endpoint"
    }

    if ($Body) {
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10)
        Write-Debug-Msg "Request body: $($params['Body'])"
    }

    if ($DryRun) {
        Write-Debug-Msg "DRY-RUN: $Method $Endpoint"
        if ($Body) {
            Write-Debug-Msg "Would send: $($params['Body'])"
        }
        return $null
    }

    try {
        $response = Invoke-RestMethod @params
        Write-Debug-Msg "Response received successfully"
        return $response
    }
    catch {
        $errorMessage = $_.Exception.Message
        if ($_.ErrorDetails) {
            $errorMessage = $_.ErrorDetails.Message
        }
        Write-Error "API request failed: $errorMessage"
        return $null
    }
}

function Configure-BranchProtection {
    Write-Info "Configuring branch protection for '$Branch' branch..."

    $endpoint = "/repos/$RepoName/branches/$Branch/protection"

    $protectionConfig = @{
        required_pull_request_reviews = @{
            dismissal_restrictions        = @{}
            dismiss_stale_reviews         = $true
            require_code_owner_reviews    = $true
            require_last_push_approval    = $true
            required_approving_review_count = 2
        }
        required_status_checks         = @{
            strict    = $true
            contexts  = @("GitHub Actions", "CodeQL")
        }
        enforce_admins                 = $true
        required_linear_history        = $false
        allow_force_pushes             = $false
        allow_deletions                = $false
        restrictions                   = $null
        require_conversation_resolution = $true
        require_signed_commits         = $true
    }

    Write-Debug-Msg "Branch protection config: $(ConvertTo-Json -InputObject $protectionConfig)"

    $result = Invoke-GitHubApi -Method "PUT" -Endpoint $endpoint -Body $protectionConfig

    if ($DryRun) {
        Write-Success "Branch protection configured for '$Branch' (DRY-RUN)"
    }
    elseif ($result) {
        Write-Success "Branch protection configured for '$Branch'"
    }
    else {
        Write-Error "Failed to configure branch protection"
        return $false
    }

    return $true
}

function Enable-AdvancedSecurityFeatures {
    Write-Info "Checking advanced security features..."

    if ($DryRun) {
        Write-Success "[DRY-RUN] Would enable advanced security features"
        return
    }

    Write-Warning "Advanced security features require GitHub Advanced Security"
    Write-Info "To enable manually:"
    Write-Info "  1. Go to Settings → Code security and analysis"
    Write-Info "  2. Enable Dependabot alerts"
    Write-Info "  3. Enable Dependabot security updates"
    Write-Info "  4. Enable Secret scanning"
    Write-Info "  5. Enable Push protection"
    Write-Info "  6. Enable CodeQL analysis"
}

# ============================================================================
# Main Function
# ============================================================================

function Main {
    # Display header
    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║   GitHub Branch Protection Configuration (PowerShell)          ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""

    # Check requirements
    Test-Requirements

    # Show configuration
    Write-Info "Configuration:"
    Write-Info "  Repository: $RepoName"
    Write-Info "  Branch: $Branch"
    Write-Info "  Dry Run: $DryRun"
    Write-Host ""

    if ($DryRun) {
        Write-Warning "DRY RUN MODE: No changes will be applied"
        Write-Host ""
    }

    # Configure branch protection
    $success = Configure-BranchProtection

    # Check advanced security
    Enable-AdvancedSecurityFeatures

    Write-Host ""
    Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║                         SUMMARY                                ║" -ForegroundColor Magenta
    Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""

    if ($DryRun) {
        Write-Info "DRY RUN: No changes were applied"
        Write-Info "Run without -DryRun to apply configurations"
    }
    elseif ($success) {
        Write-Success "Branch protection configured!"
        Write-Info "Settings applied:"
        Write-Info "  ✓ Require 2 pull request approvals"
        Write-Info "  ✓ Dismiss stale PR approvals"
        Write-Info "  ✓ Require code owner reviews"
        Write-Info "  ✓ Require signed commits"
        Write-Info "  ✓ Require conversation resolution"
        Write-Info "  ✓ Prevent force pushes"
        Write-Info "  ✓ Prevent branch deletion"
    }

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
