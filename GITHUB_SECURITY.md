# GitHub Security Configuration Guide

This document outlines the security best practices and configuration steps for securing the KitiumAI GitHub repository, protecting the main branch, and implementing advanced security features.

## Table of Contents

1. [Branch Protection Rules](#branch-protection-rules)
2. [Access Control](#access-control)
3. [Advanced Security Features](#advanced-security-features)
4. [Secret Management](#secret-management)
5. [Security Policies](#security-policies)
6. [Monitoring and Auditing](#monitoring-and-auditing)
7. [CI/CD Security](#cicd-security)
8. [Code Review Guidelines](#code-review-guidelines)

---

## Branch Protection Rules

### Overview
Branch protection rules prevent accidental or malicious changes to critical branches and enforce code quality standards.

### Configuration Steps

#### 1. Enable Branch Protection for `main` Branch

1. Go to **Settings → Branches**
2. Click **Add rule** under "Branch protection rules"
3. Pattern name: `main`
4. Configure the following settings:

#### 2. Required Settings

- **✅ Require a pull request before merging**
  - Number of approvals: **2**
  - Dismiss stale pull request approvals when new commits are pushed: **Yes**
  - Require review from code owners: **Yes**
  - Require approval of the most recent reviewable push: **Yes**

- **✅ Require status checks to pass before merging**
  - Require branches to be up to date before merging: **Yes**
  - Status checks that must pass:
    - `GitHub Actions` (all workflows)
    - `SonarQube` (quality gate)
    - `CodeQL` (security scanning)
    - Any custom CI checks

- **✅ Require conversation resolution before merging**
  - Enabled: **Yes**

- **✅ Require signed commits**
  - Enabled: **Yes**

- **✅ Require branches to be up to date before merging**
  - Enabled: **Yes**

- **✅ Require deployment to be successful before merging**
  - Select deployment environment(s): `production`, `staging`

- **✅ Lock branch**
  - Enabled: **No** (unless emergency situation)

- **✅ Allow force pushes**
  - Disabled: **Yes** (Do not allow anyone)

- **✅ Allow deletions**
  - Disabled: **Yes**

- **✅ Require code owners review**
  - Enabled: **Yes**

### Additional Branch Rules

Create similar rules for:
- `develop` - 1 approval required
- `staging` - 2 approvals required

---

## Access Control

### 1. Team Management

```
Settings → Collaborators and teams
```

#### Team Structure

**Admin Team**
- Repository role: **Maintain**
- Members: Tech leads, security team
- Permissions:
  - Merge PRs
  - Manage branch protection
  - Manage secrets
  - Manage workflows

**Contributors Team**
- Repository role: **Write**
- Members: Developers
- Permissions:
  - Push to feature branches
  - Create PRs
  - Approve code reviews

**Viewers Team**
- Repository role: **Triage**
- Members: QA, Product managers
- Permissions:
  - View code
  - Comment on issues/PRs
  - No merge permissions

### 2. CODEOWNERS File

Create `.github/CODEOWNERS`:

```
# Root and configuration files
/ @tech-leads @security-team

# Core framework
/packages/core/ @tech-leads
/packages/shared/ @tech-leads

# Framework integrations
/packages/react/ @frontend-team
/packages/vue/ @frontend-team
/packages/angular/ @frontend-team
/packages/nodejs/ @backend-team
/packages/nestjs/ @backend-team
/packages/nextjs/ @fullstack-team

# Security and infrastructure
/packages/cli/ @tech-leads
/.github/ @tech-leads @security-team

# Documentation
/docs/ @documentation-team
*.md @documentation-team

# Package configurations
package.json @tech-leads
tsconfig*.json @tech-leads
```

### 3. Require Code Owner Reviews

```
Settings → Branches → Branch protection → Require code owner reviews
```
- Enabled: **Yes**

---

## Advanced Security Features

### 1. Enable GitHub Advanced Security

```
Settings → Code security and analysis
```

#### Enable the following:

- **✅ Dependabot alerts**
  - Enabled: **Yes**

- **✅ Dependabot security updates**
  - Enabled: **Yes**

- **✅ Dependabot version updates**
  - Configuration file: `.github/dependabot.yml`

- **✅ Secret scanning**
  - Enabled: **Yes**

- **✅ Push protection**
  - Enabled: **Yes**
  - This prevents secrets from being pushed to the repository

- **✅ CodeQL analysis**
  - Enabled: **Yes**
  - Set to run on: **push** and **pull_request**

### 2. CodeQL Configuration

Create `.github/workflows/codeql.yml`:

```yaml
name: CodeQL

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'typescript']

    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v2
      with:
        languages: ${{ matrix.language }}

    - name: Autobuild
      uses: github/codeql-action/autobuild@v2

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v2
```

### 3. Dependabot Configuration

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Package dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "03:00"
    open-pull-requests-limit: 10
    reviewers:
      - "tech-leads"
    assignees:
      - "maintainers"
    labels:
      - "dependencies"
    allow:
      - dependency-type: "direct"
      - dependency-type: "indirect"
    ignore:
      # Ignore major version updates for critical packages
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]

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
```

### 4. Security Policy

Create `SECURITY.md`:

```markdown
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
- ✅ Required code reviews
- ✅ CodeQL analysis
- ✅ Dependabot alerts and updates
- ✅ Secret scanning with push protection
- ✅ Signed commits required
- ✅ CODEOWNERS enforcement
```

---

## Secret Management

### 1. Prevent Secret Leaks

#### Enable Secret Scanning with Push Protection

```
Settings → Code security and analysis → Secret scanning → Push protection
```
- Enabled: **Yes**
- This blocks commits containing detected secrets

#### Supported Secret Types

The following are automatically detected:
- AWS credentials
- GitHub tokens
- Private keys (SSH, PGP)
- API keys (Stripe, Slack, etc.)
- Database connection strings
- OAuth tokens

### 2. GitHub Secrets Configuration

```
Settings → Secrets and variables → Actions
```

#### Required Secrets for CI/CD

- `NPM_TOKEN` - For publishing packages
- `SONARQUBE_TOKEN` - For code quality analysis
- `GH_TOKEN` - For GitHub API access
- `DEPLOY_KEY` - For production deployments
- `DOCKER_USERNAME` - For Docker registry
- `DOCKER_PASSWORD` - For Docker registry

#### Environment-Specific Secrets

```
Settings → Secrets and variables → Environments
```

Create environments:
- `development`
- `staging`
- `production`

Each environment can have its own secrets and deployment protection rules.

### 3. Rotate Secrets Regularly

- **Schedule**: Every 90 days
- **Process**:
  1. Generate new secret
  2. Update in GitHub
  3. Update in all services using it
  4. Monitor for issues (24 hours)
  5. Delete old secret

---

## Security Policies

### 1. Access Control Policy

**Principle of Least Privilege**

- Grant minimum necessary permissions
- Review access quarterly
- Immediately revoke access when users leave
- Use temporary access tokens with expiration

### 2. Code Review Policy

**Before Merging to Main**

- ✅ Minimum 2 approvals from team members
- ✅ All code owner reviews required
- ✅ All status checks passing
- ✅ No security vulnerabilities detected
- ✅ Commits must be signed
- ✅ All conversations resolved

### 3. Dependency Management Policy

**Update Cycle**

- **Weekly**: Review Dependabot PRs
- **Patch updates**: Merge immediately if tests pass
- **Minor updates**: Review and test before merging
- **Major updates**: Thorough testing required, schedule 1-2 week review period

### 4. Incident Response Policy

**For Security Incidents**

1. **Immediate** (0-1 hour):
   - Acknowledge the issue
   - Form response team
   - Begin investigation

2. **Short-term** (1-24 hours):
   - Develop and test fix
   - Prepare security advisory
   - Coordinate release

3. **Long-term** (Post-release):
   - Post-mortem analysis
   - Implement preventative measures
   - Update security documentation

---

## Monitoring and Auditing

### 1. Enable Audit Logging

```
Settings → Audit log
```

Monitor for:
- Failed authentication attempts
- Repository visibility changes
- Permission changes
- Secret deletions
- Branch protection rule modifications
- Workflow modifications

### 2. Review Audit Logs

**Weekly Review Checklist:**

- [ ] Check for unauthorized access attempts
- [ ] Verify all permission changes are authorized
- [ ] Review branch protection rule modifications
- [ ] Check for unusual API usage
- [ ] Verify secret scanner alerts

### 3. GitHub Security Tab

```
Security → Overview
```

Monitor:
- **Dependabot alerts** - Vulnerable dependencies
- **Secret scanning** - Exposed secrets
- **CodeQL alerts** - Code vulnerabilities
- **Branch protection** - Status of branch rules

### 4. Set Up Alerts

**Recommended Alerts:**

- Critical vulnerabilities detected
- Secrets leaked
- Multiple failed authentication attempts
- Unauthorized collaborator added
- Branch protection rules disabled

---

## CI/CD Security

### 1. Secure GitHub Actions Workflows

Create `.github/workflows/security.yml`:

```yaml
name: Security Checks

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: false

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD

      - name: Run OWASP dependency check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          path: '.'
          format: 'JSON'

      - name: Upload results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
```

### 2. Secure Secrets in Workflows

**❌ DON'T:**
```yaml
env:
  API_KEY: ${{ secrets.API_KEY }}  # Exposed in logs
```

**✅ DO:**
```yaml
- name: Run with secret
  run: ./script.sh
  env:
    API_KEY: ${{ secrets.API_KEY }}  # Masked in logs
```

### 3. Workflow Permissions

Set in `.github/workflows/ci.yml`:

```yaml
permissions:
  contents: read
  pull-requests: read
  # Only grant needed permissions
```

### 4. Action Security

Use pinned versions of actions:

```yaml
- uses: actions/checkout@v3  # ✅ Pinned to version
- uses: actions/setup-node@v3

# ❌ Avoid using @main or @latest
# - uses: actions/checkout@main  # Not recommended
```

---

## Code Review Guidelines

### 1. Security Checklist for Reviewers

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

### 2. Common Vulnerabilities to Look For

**OWASP Top 10:**

1. **Injection** - SQL, command, template injection
2. **Broken Authentication** - Weak password policies, session management
3. **Sensitive Data Exposure** - Unencrypted data, hardcoded secrets
4. **XML External Entities (XXE)** - Unsafe XML parsing
5. **Broken Access Control** - Privilege escalation
6. **Security Misconfiguration** - Default credentials, unnecessary services
7. **Cross-Site Scripting (XSS)** - Unescaped user input
8. **Insecure Deserialization** - Unsafe object deserialization
9. **Using Components with Known Vulnerabilities** - Outdated dependencies
10. **Insufficient Logging & Monitoring** - Missing audit trails

### 3. Code Review Comments

Use these templates for security issues:

```markdown
## 🔒 Security Issue: [Vulnerability Name]

**Severity**: [Critical/High/Medium/Low]

**Description**:
[Clear explanation of the vulnerability]

**Why it matters**:
[Potential impact]

**How to fix**:
[Specific steps to resolve]

**Example**:
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)

- [ ] Enable branch protection for `main`
- [ ] Set up CODEOWNERS file
- [ ] Enable secret scanning with push protection
- [ ] Create security policy (SECURITY.md)
- [ ] Set required commits to be signed

### Phase 2: Advanced Security (Week 2)

- [ ] Enable CodeQL analysis
- [ ] Set up Dependabot (npm and GitHub Actions)
- [ ] Configure audit log monitoring
- [ ] Set up GitHub security tab monitoring
- [ ] Create security workflows

### Phase 3: Processes (Week 3)

- [ ] Train team on security policies
- [ ] Set up security review checklist
- [ ] Create incident response procedures
- [ ] Schedule regular security audits
- [ ] Document all security configurations

### Phase 4: Automation (Week 4)

- [ ] Automate dependency updates
- [ ] Set up automated security scans
- [ ] Create security dashboards
- [ ] Implement automated alerts
- [ ] Document emergency procedures

---

## Maintenance

### Monthly

- [ ] Review audit logs for anomalies
- [ ] Check Dependabot alerts
- [ ] Review CodeQL findings
- [ ] Verify branch protection rules are enforced
- [ ] Check for exposed secrets

### Quarterly

- [ ] Rotate secrets
- [ ] Review access permissions
- [ ] Update security policy
- [ ] Conduct security training
- [ ] Review incident logs

### Annually

- [ ] Full security audit
- [ ] Penetration testing
- [ ] Update security policies
- [ ] Review GitHub security features
- [ ] Plan security improvements

---

## References

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/Top10/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests)

---

## Support

For questions or issues with GitHub security configuration:

1. **General questions** → Open an issue tagged `security`
2. **Security vulnerabilities** → Email security@kitiumai.com
3. **Configuration help** → Contact tech leads
4. **Training requests** → Schedule with security team

---

**Last Updated**: November 5, 2025
**Maintained By**: Security Team
**Next Review**: December 5, 2025
