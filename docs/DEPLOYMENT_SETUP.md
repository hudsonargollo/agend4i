# Deployment Setup Guide

This comprehensive guide covers setting up Cloudflare Pages deployment for the AgendaI multi-tenant booking platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Manual Deployment](#manual-deployment)
5. [GitHub Actions Setup](#github-actions-setup)
6. [Custom Domain Configuration](#custom-domain-configuration)
7. [Validation and Testing](#validation-and-testing)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts and Tools

- **Cloudflare Account**: [Sign up here](https://cloudflare.com)
- **GitHub Account**: For automated deployments
- **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
- **Git**: For version control

### Required Access

- Admin access to Cloudflare account
- Admin access to GitHub repository
- Domain management access (for custom domain setup)

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repository-url>
cd <project-directory>

# Install dependencies
npm install

# Verify Wrangler installation
npx wrangler --version
```

### 2. Cloudflare Authentication

```bash
# Login to Cloudflare (opens browser)
npx wrangler login

# Verify authentication
npx wrangler whoami
```

### 3. Project Structure Verification

Ensure these files exist and are properly configured:

- `wrangler.toml` - Cloudflare Pages configuration
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `package.json` - Deployment scripts
- Environment files (`.env.staging`, `.env.production`)

## Environment Configuration

### Environment Variables Overview

The application uses environment-specific configuration for different deployment targets:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID | Yes | `ucmedbalujyknisrnudb` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | Yes | `eyJhbGciOiJIUzI1NiIs...` |
| `VITE_APP_DOMAIN` | Application domain | Auto-detected | `agendai.clubemkt.digital` |
| `VITE_ENVIRONMENT` | Environment type | Auto-detected | `production` |

### Environment Files Setup

#### 1. Create `.env.staging`

```bash
# Staging Environment Configuration
VITE_ENVIRONMENT=staging
VITE_APP_DOMAIN=staging.agendai.clubemkt.digital
VITE_SUPABASE_URL=https://your-staging-supabase-url.supabase.co
VITE_SUPABASE_PROJECT_ID=your-staging-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-staging-publishable-key
```

#### 2. Create `.env.production`

```bash
# Production Environment Configuration
VITE_ENVIRONMENT=production
VITE_APP_DOMAIN=agendai.clubemkt.digital
VITE_SUPABASE_URL=https://your-production-supabase-url.supabase.co
VITE_SUPABASE_PROJECT_ID=your-production-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-publishable-key
```

#### 3. Validate Configuration

```bash
# Validate staging environment
npm run env:validate:staging

# Validate production environment
npm run env:validate:production

# View environment summary
npm run env:summary
```

### Cloudflare Pages Environment Variables

Set these in your Cloudflare Pages dashboard for each environment:

**Production Project** (`agendai-saas-production`):
```
VITE_ENVIRONMENT=production
VITE_APP_DOMAIN=agendai.clubemkt.digital
VITE_SUPABASE_URL=https://your-production-url.supabase.co
VITE_SUPABASE_PROJECT_ID=your-production-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-key
```

**Staging Project** (`agendai-saas-staging`):
```
VITE_ENVIRONMENT=staging
VITE_APP_DOMAIN=staging.agendai.clubemkt.digital
VITE_SUPABASE_URL=https://your-staging-url.supabase.co
VITE_SUPABASE_PROJECT_ID=your-staging-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-staging-key
```

## Manual Deployment

### Quick Deployment Commands

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:production

# Deploy with verification
npm run deploy:production:verify
```

### Step-by-Step Manual Deployment

#### 1. Pre-deployment Validation

```bash
# Validate environment configuration
npm run validate:deployment production

# Check build configuration
npm run build:production

# Verify build output
ls -la dist/
```

#### 2. Deploy to Staging

```bash
# Full staging deployment with validation
npm run deploy:staging:verify
```

This command:
- Validates staging environment configuration
- Builds the application for staging
- Deploys to `agendai-saas-staging` project
- Verifies deployment accessibility

#### 3. Deploy to Production

```bash
# Full production deployment with validation
npm run deploy:production:verify
```

This command:
- Validates production environment configuration
- Builds the application for production
- Deploys to `agendai-saas-production` project
- Verifies deployment accessibility

#### 4. Verify Deployment

```bash
# Manual verification
npm run verify:deployment https://agendai.clubemkt.digital

# Check deployment status
npx wrangler pages deployment list
```

## GitHub Actions Setup

### 1. Repository Secrets Configuration

Navigate to your GitHub repository → Settings → Secrets and variables → Actions

#### Required Secrets

**Cloudflare API Tokens**:
```
CLOUDFLARE_API_TOKEN_PROD      # Production deployments
CLOUDFLARE_API_TOKEN_STAGING   # Staging deployments
CLOUDFLARE_API_TOKEN           # Fallback for previews
```

**Production Environment**:
```
VITE_SUPABASE_URL_PROD
VITE_SUPABASE_PROJECT_ID_PROD
VITE_SUPABASE_PUBLISHABLE_KEY_PROD
```

**Staging Environment**:
```
VITE_SUPABASE_URL_STAGING
VITE_SUPABASE_PROJECT_ID_STAGING
VITE_SUPABASE_PUBLISHABLE_KEY_STAGING
```

#### Creating Cloudflare API Tokens

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Custom token" template
4. Configure permissions:
   - **Zone:Zone Settings:Read** (for your domain)
   - **Zone:Zone:Read** (for your domain)
   - **Cloudflare Pages:Edit** (for all accounts)
5. Add zone resources for your domain
6. Create separate tokens for production and staging

### 2. Validate GitHub Secrets

```bash
# Validate all required secrets are configured
npm run secrets:validate

# Validate production secrets
npm run secrets:validate:production

# Validate staging secrets
npm run secrets:validate:staging
```

### 3. Deployment Workflow

The GitHub Actions workflow automatically:

**On Push to `main`**:
- Builds for production environment
- Deploys to `agendai.clubemkt.digital`
- Reports deployment status

**On Push to `develop`**:
- Builds for staging environment
- Deploys to `staging.agendai.clubemkt.digital`
- Reports deployment status

**On Pull Requests**:
- Builds preview version
- Deploys to temporary preview URL
- Adds deployment URL to PR comments

### 4. Monitoring Deployments

- Check GitHub Actions tab for deployment status
- View deployment logs in GitHub Actions
- Monitor deployment URLs in commit status checks
- Receive notifications on deployment failures

## Custom Domain Configuration

### DNS Setup

#### 1. Production Domain (`agendai.clubemkt.digital`)

Add these DNS records in your domain provider:

```
Type: CNAME
Name: agendai.clubemkt.digital
Target: agendai-saas-production.pages.dev
TTL: Auto or 300
```

#### 2. Staging Domain (`staging.agendai.clubemkt.digital`)

```
Type: CNAME
Name: staging.agendai.clubemkt.digital
Target: agendai-saas-staging.pages.dev
TTL: Auto or 300
```

### Cloudflare Pages Domain Configuration

#### 1. Add Custom Domain in Cloudflare Pages

1. Go to Cloudflare Pages dashboard
2. Select your project (`agendai-saas-production`)
3. Go to "Custom domains" tab
4. Click "Set up a custom domain"
5. Enter `agendai.clubemkt.digital`
6. Follow verification steps

#### 2. SSL Certificate Setup

SSL certificates are automatically provisioned by Cloudflare:
- Universal SSL certificates are issued automatically
- Full SSL/TLS encryption is enabled by default
- HTTPS redirects are configured automatically

#### 3. Verify Domain Configuration

```bash
# Check DNS propagation
nslookup agendai.clubemkt.digital

# Verify HTTPS access
curl -I https://agendai.clubemkt.digital

# Test tenant routing
curl -I https://agendai.clubemkt.digital/demo-tenant
```

### Domain Routing Configuration

The application supports tenant-based routing:

- **Root domain**: `agendai.clubemkt.digital` → Landing page
- **Tenant pages**: `agendai.clubemkt.digital/{tenant-slug}` → Tenant booking interface
- **Admin interface**: `agendai.clubemkt.digital/app` → Admin dashboard

This routing is configured in `wrangler.toml`:

```toml
[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

## Validation and Testing

### Pre-deployment Validation

```bash
# Complete environment validation
npm run env:validate:production
npm run env:validate:staging

# Build validation
npm run build:production
npm run build:staging

# Deployment configuration validation
npm run validate:deployment production
npm run validate:deployment staging
```

### Post-deployment Testing

#### 1. Accessibility Testing

```bash
# Test production deployment
npm run verify:deployment https://agendai.clubemkt.digital

# Test staging deployment
npm run verify:deployment https://staging.agendai.clubemkt.digital
```

#### 2. Functional Testing

**Test tenant routing**:
```bash
# Test tenant page access
curl -s -o /dev/null -w "%{http_code}" https://agendai.clubemkt.digital/demo-tenant
# Should return 200

# Test admin interface
curl -s -o /dev/null -w "%{http_code}" https://agendai.clubemkt.digital/app
# Should return 200
```

**Test SPA routing**:
```bash
# Test client-side routing
curl -s -o /dev/null -w "%{http_code}" https://agendai.clubemkt.digital/non-existent-route
# Should return 200 (serves index.html)
```

#### 3. Performance Testing

```bash
# Test asset loading
curl -I https://agendai.clubemkt.digital/assets/index.js

# Check compression
curl -H "Accept-Encoding: gzip" -I https://agendai.clubemkt.digital
```

### Automated Testing

The deployment system includes automated tests:

```bash
# Run all deployment-related tests
npm test -- --grep "deployment"

# Run property-based tests
npm test -- --grep "property"

# Run integration tests
npm test -- --grep "integration"
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failures

**Symptoms**: "Unauthorized" or "Authentication failed" errors

**Solutions**:
```bash
# Re-authenticate with Cloudflare
npx wrangler login

# Verify authentication
npx wrangler whoami

# Check API token permissions
# Ensure token has "Cloudflare Pages:Edit" permission
```

#### 2. Build Failures

**Symptoms**: TypeScript errors, missing dependencies, build command failures

**Solutions**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json dist
npm install

# Run build locally to debug
npm run build:production

# Check environment variables
npm run env:validate:production
```

#### 3. Domain Access Issues

**Symptoms**: Domain not accessible, SSL errors, routing issues

**Solutions**:
```bash
# Check DNS propagation
nslookup agendai.clubemkt.digital

# Verify SSL certificate
openssl s_client -connect agendai.clubemkt.digital:443 -servername agendai.clubemkt.digital

# Check Cloudflare Pages domain configuration
npx wrangler pages project list
```

#### 4. Environment Variable Issues

**Symptoms**: Application not loading correctly, API connection failures

**Solutions**:
```bash
# Validate environment configuration
npm run env:validate:production

# Check environment variable syntax
cat .env.production

# Verify Cloudflare Pages environment variables in dashboard
```

### Advanced Troubleshooting

#### Enable Verbose Logging

```bash
# Deploy with verbose output
npm run deploy:production:verbose

# Check detailed build logs
npm run build:orchestrate:production
```

#### Manual Deployment Steps

If automated deployment fails, try manual steps:

```bash
# 1. Build manually
npm run build:production

# 2. Deploy manually with Wrangler
npx wrangler pages deploy dist --project-name agendai-saas-production --env production

# 3. Verify deployment
npm run verify:deployment https://agendai.clubemkt.digital
```

#### Rollback Procedures

```bash
# List recent deployments
npx wrangler pages deployment list

# Rollback to previous deployment (if needed)
# Note: Cloudflare Pages doesn't support direct rollback
# Redeploy from previous Git commit instead:
git checkout <previous-commit-hash>
npm run deploy:production
git checkout main
```

### Getting Help

#### Error Reporting

When reporting issues, include:

1. **Environment**: production/staging/preview
2. **Command used**: Full command that failed
3. **Error message**: Complete error output
4. **Environment validation**: Output of `npm run env:validate`
5. **Build logs**: If build-related issue

#### Support Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Project Troubleshooting Guide](DEPLOYMENT_TROUBLESHOOTING.md)

#### Internal Support

For project-specific issues:
1. Check existing GitHub issues
2. Review deployment logs in GitHub Actions
3. Consult team documentation
4. Create detailed issue report with error logs

---

## Quick Reference

### Essential Commands

```bash
# Setup
npm install
npx wrangler login

# Validation
npm run env:validate:production
npm run validate:deployment production

# Deployment
npm run deploy:production:verify
npm run deploy:staging:verify

# Verification
npm run verify:deployment https://agendai.clubemkt.digital
npx wrangler pages deployment list

# Troubleshooting
npm run env:summary
npm run secrets:validate
npm run deploy:production:verbose
```

### Key Files

- `wrangler.toml` - Cloudflare Pages configuration
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `.env.production` - Production environment variables
- `.env.staging` - Staging environment variables
- `package.json` - Deployment scripts

### Important URLs

- **Production**: https://agendai.clubemkt.digital
- **Staging**: https://staging.agendai.clubemkt.digital
- **Cloudflare Dashboard**: https://dash.cloudflare.com
- **GitHub Actions**: https://github.com/your-repo/actions