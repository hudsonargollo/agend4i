# Google OAuth Troubleshooting Guide

This guide helps diagnose and fix common Google OAuth authentication issues in the AgendAi application.

## Quick Diagnosis

Run the OAuth configuration validator:
```bash
node scripts/validate-oauth-config.js
```

## Common Issues and Solutions

### 1. "OAuth configuration errors" or "Google OAuth not configured"

**Symptoms:**
- OAuth buttons show "Configurando..." and never become active
- Console errors about missing configuration
- OAuth flow doesn't initiate

**Solutions:**
1. Verify environment variables are set correctly:
   ```bash
   # Check if variables are loaded
   echo $VITE_GOOGLE_CLIENT_ID
   echo $VITE_SUPABASE_URL
   echo $VITE_APP_DOMAIN
   ```

2. Ensure Google Client ID format is correct:
   - Should end with `.apps.googleusercontent.com`
   - Should not be the placeholder `your_google_client_id_here`

3. Restart development server after changing environment variables

### 2. "Redirect URI mismatch" error

**Symptoms:**
- Google OAuth consent screen shows redirect URI mismatch error
- OAuth flow fails after Google authentication

**Solutions:**
1. Verify redirect URLs in Google Cloud Console match exactly:
   - Development: `http://localhost:8080/auth/callback`
   - Staging: `https://staging.agendai.clubemkt.digital/auth/callback`
   - Production: `https://agendai.clubemkt.digital/auth/callback`
   - Supabase: `https://jiekzfipiwhlhhkmzuvr.supabase.co/auth/v1/callback`

2. Check for trailing slashes or protocol mismatches
3. Ensure the domain in VITE_APP_DOMAIN matches the redirect URL

### 3. "OAuth provider not enabled" or Supabase configuration issues

**Symptoms:**
- OAuth flow fails with provider not enabled error
- Supabase authentication errors

**Solutions:**
1. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google provider
   - Enter correct Client ID and Client Secret
   - Set redirect URL: `https://jiekzfipiwhlhhkmzuvr.supabase.co/auth/v1/callback`

2. Verify OAuth scopes are configured:
   - `openid`
   - `email`
   - `profile`

### 4. "CSRF token validation failed" or security errors

**Symptoms:**
- OAuth callback fails with CSRF errors
- Security validation warnings in console

**Solutions:**
1. Clear browser storage and cookies
2. Ensure sessionStorage is available and working
3. Check if browser is blocking third-party cookies
4. Try in incognito/private browsing mode

### 5. OAuth works in development but fails in production

**Symptoms:**
- OAuth works on localhost but fails on deployed domains
- Different behavior between environments

**Solutions:**
1. Verify production environment variables are set correctly
2. Check that production domain is added to Google OAuth client
3. Ensure HTTPS is properly configured for production
4. Verify Supabase project settings match production environment

### 6. "Invalid client" or Google Console configuration issues

**Symptoms:**
- Google OAuth shows invalid client error
- OAuth consent screen doesn't appear

**Solutions:**
1. Verify Google OAuth client configuration:
   - Client ID matches environment variable
   - Client Secret is set in Supabase (not in frontend)
   - OAuth consent screen is properly configured
   - Application is not in testing mode for production use

2. Check OAuth scopes in Google Console:
   - Should include email, profile, openid
   - No unnecessary scopes that require verification

### 7. User creation or authentication issues after OAuth

**Symptoms:**
- OAuth completes but user is not created/authenticated
- Redirect loops or authentication state issues

**Solutions:**
1. Check Supabase Auth logs for errors
2. Verify user creation policies in Supabase
3. Check if email domain restrictions are blocking OAuth users
4. Ensure proper user profile data mapping

## Debug Steps

### 1. Check Browser Console
Look for errors in browser developer tools:
- OAuth configuration warnings
- Network request failures
- JavaScript errors during OAuth flow

### 2. Check Network Requests
Monitor network tab during OAuth flow:
- OAuth initiation request to Supabase
- Redirect to Google OAuth
- Callback request handling
- Session establishment

### 3. Verify Environment Loading
Test environment variable loading:
```javascript
// In browser console
console.log('VITE_GOOGLE_CLIENT_ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_APP_DOMAIN:', import.meta.env.VITE_APP_DOMAIN);
```

### 4. Test OAuth Configuration
Use the built-in validation:
```javascript
// In browser console
import { getOAuthConfig, validateOAuthConfig } from '/src/lib/oauth-config.ts';
const config = getOAuthConfig();
const validation = validateOAuthConfig(config);
console.log('Config:', config);
console.log('Validation:', validation);
```

## Environment-Specific Checks

### Development Environment
- Ensure `http://localhost:8080` is in Google OAuth redirect URIs
- Check that VITE_APP_DOMAIN is set to `localhost:8080`
- Verify development server is running on correct port

### Staging Environment
- Ensure `https://staging.agendai.clubemkt.digital` is in Google OAuth redirect URIs
- Check that VITE_APP_DOMAIN is set to `staging.agendai.clubemkt.digital`
- Verify SSL certificate is valid

### Production Environment
- Ensure `https://agendai.clubemkt.digital` is in Google OAuth redirect URIs
- Check that VITE_APP_DOMAIN is set to `agendai.clubemkt.digital`
- Verify production deployment has correct environment variables

## Security Considerations

### CSRF Protection
- OAuth state parameter is automatically generated and validated
- SessionStorage is used for temporary state storage
- State expires after 5 minutes for security

### Token Security
- OAuth tokens are handled securely by Supabase
- No sensitive tokens are stored in localStorage
- Automatic token refresh is handled by Supabase client

## Getting Help

If issues persist after following this guide:

1. Check Supabase Auth logs in dashboard
2. Review Google Cloud Console OAuth client configuration
3. Test OAuth flow in incognito mode
4. Contact development team with:
   - Specific error messages
   - Browser console logs
   - Network request details
   - Environment being tested

## Related Documentation

- [Google OAuth Setup Guide](./GOOGLE_OAUTH_SETUP.md)
- [Environment Configuration](./ENVIRONMENT_CONFIGURATION.md)
- [Deployment Setup](./DEPLOYMENT_SETUP.md)