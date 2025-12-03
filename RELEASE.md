# Release Process for @kitiumai/scripts

This document explains how to release new versions of the `@kitiumai/scripts` package.

## Automated Release Process

The package uses GitHub Actions workflows for automated releases:

### 1. Tagging a Release

Use the **"Tag @kitiumai/scripts Release"** workflow to create a new release tag:

1. Go to [GitHub Actions](https://github.com/kitiumai/monorepo/actions)
2. Select "Tag @kitiumai/scripts Release" workflow
3. Click "Run workflow"
4. Enter the version number (e.g., `1.0.0`, `1.1.0`, `2.0.0`)
5. Select release type (patch/minor/major)
6. Click "Run workflow"

This workflow will:
- ✅ Validate the version format
- ✅ Check if the tag already exists
- ✅ Build and test the package
- ✅ Update `package.json` version
- ✅ Commit and push the version bump
- ✅ Create and push the tag (`@kitiumai/scripts@1.0.0`)

### 2. Publishing the Release

Once the tag is pushed, the **"Release @kitiumai/scripts"** workflow automatically triggers:

This workflow will:
- ✅ Checkout the tagged commit
- ✅ Build the package
- ✅ Run tests, linting, and type checking
- ✅ Perform security scans
- ✅ Publish to NPM registry
- ✅ Generate SBOM (Software Bill of Materials)
- ✅ Create a GitHub release with changelog
- ✅ Upload SBOM to the release

## Manual Release (Not Recommended)

If you need to release manually (not recommended for production):

```bash
# 1. Ensure you're on main branch and up to date
git checkout main
git pull origin main

# 2. Build and test
cd tooling/scripts
pnpm run build
pnpm run test
pnpm run lint
pnpm run type-check

# 3. Update version
npm version 1.0.0 --no-git-tag-version

# 4. Commit version bump
git add package.json
git commit -m "chore: bump @kitiumai/scripts to v1.0.0"

# 5. Create and push tag
git tag "@kitiumai/scripts@1.0.0"
git push origin main
git push origin "@kitiumai/scripts@1.0.0"

# 6. Publish (after tag triggers the workflow)
# The automated workflow will handle publishing
```

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (x.y.0): New features, backward compatible
- **PATCH** (x.y.z): Bug fixes, backward compatible

## Tag Format

Tags must follow the format: `@kitiumai/scripts@<version>`

Examples:
- `@kitiumai/scripts@1.0.0`
- `@kitiumai/scripts@1.1.0`
- `@kitiumai/scripts@2.0.0`

## Release Checklist

Before creating a release, ensure:

- [ ] All tests pass (`pnpm run test`)
- [ ] Code is properly linted (`pnpm run lint`)
- [ ] Type checking passes (`pnpm run type-check`)
- [ ] No security issues (`pnpm run security:check`)
- [ ] Documentation is up to date
- [ ] Changes are committed and pushed to main

## Troubleshooting

### Tag Already Exists
If you get an error that the tag already exists:
1. Check existing tags: `git tag -l | grep "@kitiumai/scripts"`
2. Delete the tag if needed: `git tag -d @kitiumai/scripts@1.0.0 && git push origin :refs/tags/@kitiumai/scripts@1.0.0`
3. Choose a different version number

### NPM Publish Fails
Common issues:
- **Authentication**: Ensure `NPM_TOKEN` secret is set in GitHub repository settings
- **Version conflict**: Check if the version already exists on NPM
- **Build issues**: Ensure the package builds correctly before publishing

### Workflow Permissions
Ensure the repository has the following settings:
- Actions can create and approve pull requests
- Allow GitHub Actions to create and approve pull requests
- Read and write permissions for workflows

## Support

For issues with releases:
1. Check the GitHub Actions logs
2. Verify repository secrets are configured
3. Ensure the package builds locally
4. Check NPM registry status

---

**Note**: The automated workflow ensures consistent, secure releases with proper testing and security scanning.