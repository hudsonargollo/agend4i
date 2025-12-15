# GitHub Deployment Status Integration

This document describes the GitHub deployment status integration system that automatically reports deployment status back to GitHub commits and pull requests.

## Overview

The GitHub deployment status integration provides:

- **Commit Status Updates**: Automatic status updates on commits showing deployment progress
- **Pull Request Comments**: Detailed deployment information in PR comments with URLs and performance metrics
- **Deployment Environment Tracking**: Proper GitHub deployment environment management
- **Manual and Automated Reporting**: Works with both manual deployments and GitHub Actions

## Features

### Automatic Status Reporting

The system automatically reports deployment status at key stages:

1. **Pending**: When deployment starts
2. **Success**: When deployment completes successfully with URLs and metrics
3. **Failure**: When deployment fails with error details
4. **Error**: When unexpected errors occur

### Pull Request Integration

For pull requests, the system:

- Creates or updates a single comment with deployment status
- Includes deployment URLs (both main and preview URLs)
- Shows build and deployment performance metrics
- Provides error details and troubleshooting links when deployments fail

### Environment Tracking

Supports multiple deployment environments:

- **Production**: `main` branch deployments to `agendai.clubemkt.digital`
- **Staging**: `develop` branch deployments to `staging.agendai.clubemkt.digital`
- **Preview**: Pull request deployments to `*.pages.dev` URLs

## Configuration

### Environment Variables

The system uses these environment variables (automatically available in GitHub Actions):

```bash
# Required for GitHub API access
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPOSITORY=owner/repo-name
GITHUB_REPOSITORY_OWNER=owner
GITHUB_SHA=commit-sha

# Event information (for PR integration)
GITHUB_EVENT_NAME=pull_request
GITHUB_EVENT_NUMBER=123

# Deployment configuration
DEPLOYMENT_ENVIRONMENT=production|staging|preview
```

### GitHub Actions Integration

The system is automatically integrated into the GitHub Actions workflow at `.github/workflows/deploy.yml`. No additional configuration is required.

### Manual Deployment Integration

For manual deployments, the system automatically detects GitHub environment variables and reports status when available. To disable GitHub reporting for manual deployments:

```bash
npm run deploy:production -- --no-github
```

## Usage

### Automatic Usage (Recommended)

The system works automatically with:

- **GitHub Actions**: Status reporting is built into the deployment workflow
- **Manual Deployments**: Automatically detects GitHub environment and reports status

### Manual Status Reporting

You can manually report deployment status using the CLI script:

```bash
# Report pending deployment
node scripts/github-deployment-status.js pending \
  --description="Starting deployment to production"

# Report successful deployment
node scripts/github-deployment-status.js success \
  --url="https://agendai.clubemkt.digital" \
  --description="Deployment completed successfully" \
  --build-time=45000 \
  --deploy-time=30000

# Report deployment failure
node scripts/github-deployment-status.js failure \
  --description="Build failed" \
  --error="TypeScript compilation error in src/components/App.tsx"
```

### NPM Scripts

Convenient npm scripts are available:

```bash
npm run github:status:pending
npm run github:status:success
npm run github:status:failure
npm run github:status:error
```

## API Reference

### GitHubDeploymentStatusReporter Class

The main class for GitHub integration:

```typescript
import { GitHubDeploymentStatusReporter } from './src/lib/github-deployment-status.js';

const reporter = new GitHubDeploymentStatusReporter({
  owner: 'myorg',
  repo: 'myrepo',
  token: 'ghp_xxxxxxxxxxxx',
  sha: 'commit-sha',
  environment: 'production',
  pullRequestNumber: 123 // Optional, for PR integration
});

// Report deployment status
await reporter.reportDeploymentStatus({
  status: 'success',
  description: 'Deployment completed successfully',
  url: 'https://agendai.clubemkt.digital',
  buildTime: 45000,
  deployTime: 30000
});
```

### CLI Script Options

The `scripts/github-deployment-status.js` script supports these options:

```bash
Commands:
  pending     Report deployment as pending/in-progress
  success     Report successful deployment
  failure     Report failed deployment
  error       Report deployment error

Options:
  --url=URL                 Deployment URL
  --preview-url=URL         Preview URL (if different from main URL)
  --description=TEXT        Status description
  --error=TEXT              Error message (for failure/error status)
  --build-time=MS           Build time in milliseconds
  --deploy-time=MS          Deploy time in milliseconds
  --environment=ENV         Environment (production, staging, preview)
  --create-deployment       Create GitHub deployment record
  --owner=OWNER             GitHub repository owner
  --repo=REPO               GitHub repository name
  --token=TOKEN             GitHub token
  --sha=SHA                 Git commit SHA
  --pr=NUMBER               Pull request number
```

## GitHub Permissions

The GitHub token requires these permissions:

- **Repository permissions**:
  - `contents: read` - Read repository content
  - `deployments: write` - Create and update deployments
  - `statuses: write` - Create commit statuses
  - `pull-requests: write` - Comment on pull requests

For GitHub Actions, use the built-in `GITHUB_TOKEN` which has appropriate permissions.

## Troubleshooting

### Common Issues

1. **Missing GitHub Token**
   ```
   Error: Missing required GitHub configuration
   ```
   - Ensure `GITHUB_TOKEN` environment variable is set
   - For GitHub Actions, use `${{ secrets.GITHUB_TOKEN }}`

2. **Permission Denied**
   ```
   Error: GitHub API error: 403 Forbidden
   ```
   - Check that the GitHub token has required permissions
   - Ensure the repository allows the token to create deployments and statuses

3. **Repository Not Found**
   ```
   Error: GitHub API error: 404 Not Found
   ```
   - Verify `GITHUB_REPOSITORY` environment variable is correct
   - Ensure the token has access to the repository

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# For manual deployments
npm run deploy:production -- --verbose

# For status reporting
node scripts/github-deployment-status.js success --verbose
```

### Testing

Test the GitHub integration without actual deployment:

```bash
# Dry run deployment (won't report to GitHub)
npm run deploy:production -- --dry-run

# Test status reporting with manual configuration
node scripts/github-deployment-status.js success \
  --owner=myorg --repo=myrepo --token=ghp_xxx --sha=abc123 \
  --url="https://example.com" --environment=production
```

## Examples

### GitHub Actions Workflow

The deployment workflow automatically handles status reporting:

```yaml
- name: Deploy to Cloudflare Pages
  run: npm run deploy:${{ matrix.environment }}
  # Status reporting is built into the deployment process

- name: Report deployment status to GitHub
  if: always()
  run: |
    if [ "${{ job.status }}" = "success" ]; then
      node scripts/github-deployment-status.js success \
        --url="https://${{ matrix.domain }}" \
        --description="Deployment completed successfully"
    else
      node scripts/github-deployment-status.js failure \
        --description="Deployment failed"
    fi
```

### Pull Request Comment Example

When a deployment completes, the system creates/updates a PR comment like this:

```markdown
## 🚀 Deployment Status

✅ **Successful** deployment to **preview**

**Commit:** `abc1234`
🌐 **Live URL:** https://preview-abc1234.pages.dev
🔗 **Preview URL:** https://staging.agendai.clubemkt.digital

**Performance:**
- Build time: 45s
- Deploy time: 30s

---
*Updated at 2024-01-15T10:30:00.000Z*
```

### Integration with Existing Deployment Scripts

The GitHub status reporting is automatically integrated into existing deployment scripts. No changes to your deployment workflow are required - the system detects GitHub environment variables and reports status when available.

## Security Considerations

- GitHub tokens are handled securely and never logged
- API responses are sanitized to prevent sensitive data exposure
- The system gracefully handles missing permissions without failing deployments
- All GitHub API calls include proper error handling and retry logic

## Performance Impact

The GitHub status reporting adds minimal overhead to deployments:

- API calls are asynchronous and don't block the deployment process
- Failed status reporting doesn't fail the deployment
- Typical overhead: 1-3 seconds per deployment for status reporting