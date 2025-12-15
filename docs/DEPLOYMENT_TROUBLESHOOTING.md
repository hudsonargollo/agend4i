# Deployment Troubleshooting Guide

This guide provides comprehensive troubleshooting information for common deployment issues with Cloudflare Pages.

## Quick Diagnosis

If your deployment fails, the system will automatically classify the error and provide specific recovery options. Look for the error type in the deployment output:

- **NETWORK**: Connectivity or timeout issues
- **AUTHENTICATION**: Cloudflare login or API token problems  
- **BUILD**: Application build process failures
- **CONFIGURATION**: wrangler.toml or environment variable issues
- **QUOTA**: Cloudflare resource limits exceeded
- **VALIDATION**: Missing requirements or invalid settings

## Common Issues and Solutions

### 1. Network Connectivity Issues

**Symptoms:**
- Connection timeouts
- "ECONNRESET" or "ENOTFOUND" errors
- "Network error" messages

**Possible Causes:**
- Unstable internet connection
- Firewall blocking outbound connections
- DNS resolution issues
- Cloudflare service temporary unavailability

**Solutions:**
1. Check your internet connection stability
2. Verify firewall settings allow connections to Cloudflare (*.cloudflare.com, *.pages.dev)
3. Try using a different network or VPN
4. Wait a few minutes and retry the deployment
5. Check [Cloudflare Status Page](https://www.cloudflarestatus.com/) for service issues

**Prevention:**
- Use a stable internet connection for deployments
- Configure proper firewall rules for development tools
- Monitor Cloudflare status before deploying

### 2. Authentication Problems

**Symptoms:**
- "Unauthorized" or "Authentication failed" errors
- "Please run wrangler login" messages
- API token permission errors

**Possible Causes:**
- Wrangler not authenticated
- Expired authentication token
- Insufficient API token permissions
- Wrong Cloudflare account

**Solutions:**
1. Re-authenticate with Cloudflare:
   ```bash
   wrangler login
   ```
2. Check API token permissions in Cloudflare dashboard
3. Verify you're using the correct Cloudflare account
4. Ensure API token has "Cloudflare Pages:Edit" permissions
5. For CI/CD, verify `CLOUDFLARE_API_TOKEN` environment variable is set

**Prevention:**
- Regularly refresh authentication tokens
- Use API tokens with appropriate scopes
- Document authentication setup for team members
- Set up token expiration reminders

### 3. Build Process Failures

**Symptoms:**
- TypeScript compilation errors
- "Module not found" errors
- Build command failures
- Missing dependencies

**Possible Causes:**
- TypeScript compilation errors
- Missing or outdated dependencies
- Syntax errors in code
- Environment variable configuration issues
- Build configuration problems

**Solutions:**
1. Run build locally to identify issues:
   ```bash
   npm run build:production
   ```
2. Fix TypeScript errors shown in the output
3. Install missing dependencies:
   ```bash
   npm install
   ```
4. Check environment variables are properly configured
5. Verify Vite configuration is correct
6. Clear node_modules and reinstall if needed:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**Prevention:**
- Run builds locally before deploying
- Use TypeScript strict mode to catch errors early
- Set up pre-commit hooks to validate builds
- Keep dependencies up to date
- Use exact dependency versions in production

### 4. Resource Quota Exceeded

**Symptoms:**
- "Quota exceeded" or "Rate limit" errors
- "Too many deployments" messages
- File size limit errors

**Possible Causes:**
- Daily deployment limit reached
- File size limits exceeded
- Too many concurrent deployments
- Account plan limitations

**Solutions:**
1. Wait for quota reset (usually resets daily)
2. Optimize build output to reduce file sizes:
   ```bash
   npm run build -- --analyze
   ```
3. Remove unused assets from build output
4. Upgrade Cloudflare plan if needed
5. Use deployment scheduling to avoid hitting limits

**Prevention:**
- Monitor deployment frequency
- Optimize assets and bundle sizes
- Use appropriate Cloudflare plan for your needs
- Implement build optimization strategies
- Set up deployment quotas monitoring

### 5. Configuration Issues

**Symptoms:**
- "Invalid wrangler.toml" errors
- "Missing environment variable" errors
- "Project not found" errors

**Possible Causes:**
- Invalid wrangler.toml syntax
- Missing required environment variables
- Incorrect project settings
- Environment-specific configuration errors

**Solutions:**
1. Validate wrangler.toml syntax and required fields
2. Check all required environment variables are set:
   ```bash
   # Required variables:
   VITE_SUPABASE_PROJECT_ID
   VITE_SUPABASE_PUBLISHABLE_KEY
   VITE_SUPABASE_URL
   VITE_APP_DOMAIN
   ```
3. Verify project name matches Cloudflare Pages project
4. Review environment-specific configurations
5. Use the validation script:
   ```bash
   npm run validate:deployment
   ```

**Prevention:**
- Use configuration validation tools
- Document required environment variables
- Test configurations in staging environment first
- Keep configuration files in version control
- Use environment variable templates

## Automated Recovery Options

The deployment system provides several automated recovery options:

### Retry with Exponential Backoff
- Automatically retries network-related failures
- Uses exponential backoff (2s, 4s, 8s delays)
- Maximum 3 retry attempts by default

### Rollback to Previous Deployment
- Available when previous successful deployment exists
- Provides rollback command and URL
- Maintains deployment history for reference

### Error Classification and Guidance
- Automatically classifies error types
- Provides specific recovery actions
- Generates detailed troubleshooting reports

## Manual Recovery Procedures

### 1. Complete Rollback Process
If automated rollback isn't sufficient:

1. Identify the last successful deployment:
   ```bash
   wrangler pages deployment list
   ```

2. Note the deployment ID and URL

3. If needed, redeploy from a previous Git commit:
   ```bash
   git checkout <previous-commit-hash>
   npm run deploy:production
   git checkout main
   ```

### 2. Environment Reset
For persistent configuration issues:

1. Clear all cached configurations:
   ```bash
   rm -rf .wrangler
   rm -rf node_modules
   rm -rf dist
   ```

2. Reinstall dependencies:
   ```bash
   npm install
   ```

3. Re-authenticate with Cloudflare:
   ```bash
   wrangler login
   ```

4. Validate configuration:
   ```bash
   npm run validate:deployment production
   ```

5. Retry deployment:
   ```bash
   npm run deploy:production
   ```

### 3. Build Environment Debugging
For complex build issues:

1. Enable verbose logging:
   ```bash
   npm run deploy:production -- --verbose
   ```

2. Check build output locally:
   ```bash
   npm run build:production
   ls -la dist/
   ```

3. Verify environment variables:
   ```bash
   cat .env.production
   ```

4. Test with minimal configuration:
   ```bash
   npm run build -- --mode production --debug
   ```

## Monitoring and Prevention

### Deployment Health Checks
Set up monitoring for:
- Deployment success rates
- Build times and performance
- Error frequency and types
- Resource usage and quotas

### Best Practices
1. **Test Locally First**: Always run builds and tests locally before deploying
2. **Use Staging Environment**: Test deployments in staging before production
3. **Monitor Dependencies**: Keep dependencies updated and secure
4. **Backup Configurations**: Store configurations in version control
5. **Document Procedures**: Maintain up-to-date deployment documentation

### Preventive Measures
- Set up automated testing in CI/CD pipeline
- Use dependency vulnerability scanning
- Implement deployment approval workflows
- Monitor Cloudflare service status
- Regular backup of deployment configurations

## Getting Help

### Automated Error Reports
The system generates comprehensive error reports including:
- Error classification and details
- Recovery action recommendations
- Troubleshooting guides
- Rollback information when available

### Manual Support Channels
1. **Cloudflare Community**: [community.cloudflare.com](https://community.cloudflare.com)
2. **Cloudflare Documentation**: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
3. **GitHub Issues**: For project-specific problems
4. **Team Documentation**: Internal troubleshooting procedures

### Escalation Process
1. Try automated recovery options first
2. Follow relevant troubleshooting guide
3. Check Cloudflare status and community forums
4. Create detailed issue report with error logs
5. Escalate to team lead or DevOps if needed

## Error Report Template

When reporting deployment issues, include:

```
**Environment**: production/staging/preview
**Deployment Command**: npm run deploy:production
**Error Type**: NETWORK/BUILD/AUTH/CONFIG/QUOTA
**Error Message**: [Full error message]
**Timestamp**: [When the error occurred]
**Previous Successful Deployment**: [URL and timestamp if known]
**Recovery Attempts**: [What you've tried]
**Additional Context**: [Any relevant information]
```

## Appendix: Common Error Codes

| Error Code | Description | Typical Cause | Recovery Action |
|------------|-------------|---------------|-----------------|
| NETWORK_ERROR | Connection issues | Internet/firewall | Retry after checking connectivity |
| AUTH_ERROR | Authentication failed | Expired token | Run `wrangler login` |
| BUILD_ERROR | Build process failed | Code/config issues | Fix build errors locally |
| CONFIG_ERROR | Configuration invalid | wrangler.toml/env vars | Validate configuration |
| QUOTA_ERROR | Resource limits hit | Too many deployments | Wait for quota reset |
| VALIDATION_ERROR | Missing requirements | Setup incomplete | Complete setup steps |

---

*This guide is automatically updated based on deployment error patterns and user feedback.*