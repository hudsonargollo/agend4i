# GitHub Secrets Setup Guide

This guide explains how to configure GitHub Secrets for secure deployment of the SaaS application to Cloudflare Pages.

## Overview

The deployment system uses GitHub Secrets to securely store sensitive configuration like API tokens and environment variables. This ensures that credentials are never exposed in code or logs while enabling automated deployments.

## Required Secrets

### Core Secrets (Required for all environments)

#### `CLOUDFLARE_API_TOKEN`
- **Description**: Cloudflare API token for deploying to Cloudflare Pages
- **How to get**: 
  1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
  2. Click "Create Token"
  3. Use "Custom token" template
  4. Set permissions:
     - Zone: Zone Settings:Read, Zone:Read
     - Account: Cloudflare Pages:Edit
  5. Set Account Resources to include your account
  6. Set Zone Resources to include your domain (agendai.clubemkt.digital)
- **Scope**: Used as fallback for all environments

#### `VITE_SUPABASE_URL`
- **Description**: Supabase project URL
- **Example**: `https://ucmedbalujyknisrnudb.supabase.co`
- **How to get**: From your Supabase project settings
- **Scope**: Used as fallback for all environments

#### `VITE_SUPABASE_PROJECT_ID`
- **Description**: Supabase project ID
- **Example**: `ucmedbalujyknisrnudb`
- **How to get**: From your Supabase project URL or settings
- **Scope**: Used as fallback for all environments

#### `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Description**: Supabase anonymous/public key
- **How to get**: From Supabase project settings > API
- **Scope**: Used as fallback for all environments

### Environment-Specific Secrets (Optional but Recommended)

For enhanced security, you can configure separate secrets for each environment:

#### Production Environment
- `CLOUDFLARE_API_TOKEN_PROD`: Production-specific Cloudflare API token
- `VITE_SUPABASE_URL_PROD`: Production Supabase URL
- `VITE_SUPABASE_PROJECT_ID_PROD`: Production Supabase project ID
- `VITE_SUPABASE_PUBLISHABLE_KEY_PROD`: Production Supabase publishable key

#### Staging Environment
- `CLOUDFLARE_API_TOKEN_STAGING`: Staging-specific Cloudflare API token
- `VITE_SUPABASE_URL_STAGING`: Staging Supabase URL
- `VITE_SUPABASE_PROJECT_ID_STAGING`: Staging Supabase project ID
- `VITE_SUPABASE_PUBLISHABLE_KEY_STAGING`: Staging Supabase publishable key

## Setting Up GitHub Secrets

### Step 1: Access Repository Settings

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" > "Actions"

### Step 2: Add Repository Secrets

For each secret listed above:

1. Click "New repository secret"
2. Enter the secret name (exactly as shown above)
3. Enter the secret value
4. Click "Add secret"

### Step 3: Verify Secret Configuration

The GitHub Actions workflow includes automatic validation that checks if required secrets are present before deployment. If secrets are missing, the workflow will fail with a clear error message.

## Security Best Practices

### 1. Use Environment-Specific Tokens

Create separate Cloudflare API tokens for production and staging:

- **Production token**: Limited to production Cloudflare Pages project only
- **Staging token**: Limited to staging Cloudflare Pages project only
- **Fallback token**: Can access both projects (used for preview deployments)

### 2. Principle of Least Privilege

When creating Cloudflare API tokens:

- Only grant necessary permissions (Cloudflare Pages:Edit)
- Limit to specific accounts and zones
- Set IP restrictions if possible
- Use token expiration dates

### 3. Regular Token Rotation

- Rotate API tokens every 90 days
- Update GitHub Secrets when tokens are rotated
- Monitor token usage in Cloudflare dashboard

### 4. Separate Supabase Projects (Recommended)

For maximum security, use separate Supabase projects for production and staging:

- Production project with production data
- Staging project with test data
- Different API keys for each environment

## Environment Variable Fallback Strategy

The deployment system uses a fallback strategy for environment variables:

1. **First priority**: Environment-specific secret (e.g., `VITE_SUPABASE_URL_PROD`)
2. **Fallback**: Generic secret (e.g., `VITE_SUPABASE_URL`)

This allows you to:
- Start with generic secrets for all environments
- Gradually migrate to environment-specific secrets
- Maintain backward compatibility

## Troubleshooting

### Missing Secrets Error

If you see an error like "Missing CLOUDFLARE_API_TOKEN for deployment":

1. Check that the secret name matches exactly (case-sensitive)
2. Verify the secret has a value (not empty)
3. Ensure you're adding secrets to the correct repository
4. Check that the secret is a "Repository secret" not an "Environment secret"

### Invalid API Token

If deployment fails with authentication errors:

1. Verify the Cloudflare API token has correct permissions
2. Check that the token hasn't expired
3. Ensure the token has access to the correct Cloudflare account
4. Verify the token can access the specific Cloudflare Pages project

### Environment Variable Issues

If the application doesn't work correctly after deployment:

1. Check that Supabase URLs are correct and accessible
2. Verify Supabase project IDs match your actual projects
3. Ensure publishable keys are valid and not expired
4. Test the Supabase connection from your local environment first

## Validation Script

You can validate your secret configuration by running the deployment workflow manually:

1. Go to "Actions" tab in your GitHub repository
2. Select "Deploy to Cloudflare Pages" workflow
3. Click "Run workflow"
4. Select the branch you want to test
5. The workflow will validate secrets before attempting deployment

## Security Monitoring

### What to Monitor

- Failed authentication attempts in Cloudflare dashboard
- Unusual API token usage patterns
- Deployment failures due to credential issues
- Supabase project access logs

### Alerts to Set Up

- Cloudflare API token usage alerts
- Supabase project access monitoring
- GitHub Actions workflow failure notifications
- Security scanning alerts for exposed credentials

## Emergency Procedures

### If API Token is Compromised

1. **Immediately revoke** the compromised token in Cloudflare dashboard
2. **Generate a new token** with the same permissions
3. **Update GitHub Secret** with the new token value
4. **Review recent deployments** for any unauthorized changes
5. **Check Cloudflare audit logs** for suspicious activity

### If Supabase Credentials are Exposed

1. **Rotate Supabase API keys** in project settings
2. **Update GitHub Secrets** with new keys
3. **Review Supabase logs** for unauthorized access
4. **Check database for any unauthorized changes**
5. **Consider enabling additional Supabase security features**

## Additional Resources

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Cloudflare API Token Documentation](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)