# Google OAuth Setup Guide

This guide explains how to configure Google OAuth authentication for the AgendAi application.

## Prerequisites

- Access to Google Cloud Console
- Access to Supabase Dashboard
- Admin access to the AgendAi project

## Step 1: Google Cloud Console Setup

### 1.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project for   
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Configure the OAuth consent screen if not already done:
   - Application name: "AgendAi"
   - User support email: Your support email
   - Developer contact information: Your contact email
6. Select **Web application** as the application type
7. Add the following **Authorized redirect URIs**:

### 1.2 Redirect URLs Configuration

Add these redirect URLs to your Google OAuth client:

**Development:**
```
http://localhost:8080/auth/callback
https://ucmedbalujyknisrnudb.supabase.co/auth/v1/callback
```

**Staging:**
```
https://staging.agendai.clubemkt.digital/auth/callback
https://ucmedbalujyknisrnudb.supabase.co/auth/v1/callback
```

**Production:**
```
https://agendai.clubemkt.digital/auth/callback
https://ucmedbalujyknisrnudb.supabase.co/auth/v1/callback
```

### 1.3 Get Client Credentials

After creating the OAuth client, copy:
- **Client ID** - This will be used in environment variables

- **Client Secret** - This will be configured in Supabase


## Step 2: Supabase Configuration

### 2.1 Enable Google OAuth Provider

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your AgendAi project
3. Navigate to **Authentication** > **Providers**
4. Find **Google** in the list and click **Configure**
5. Enable the Google provider
6. Enter the **Client ID** and **Client Secret** from Google Cloud Console
7. Configure the redirect URL: `https://ucmedbalujyknisrnudb.supabase.co/auth/v1/callback`

### 2.2 Configure OAuth Scopes

Ensure the following scopes are enabled:
- `openid`
- `email`
- `profile`

### 2.3 Additional Settings

- **Skip email confirmation**: Consider enabling for OAuth users
- **Auto-confirm users**: Enable for smoother OAuth flow
- **Allow duplicate emails**: Disable to prevent account conflicts

## Step 3: Environment Variables

### 3.1 Update Environment Files

Replace `your_google_client_id_here` in all environment files with your actual Google Client ID:

**Files to update:**
- `.env`
- `.env.development`
- `.env.production`
- `.env.staging`

**Variable:**
```
VITE_GOOGLE_CLIENT_ID=your_actual_google_client_id
```

### 3.2 Environment-Specific Configuration

Each environment should use the same Google Client ID, but ensure the redirect URLs in Google Cloud Console match the domains for each environment.

## Step 4: Testing OAuth Flow

### 4.1 Development Testing

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:8080/auth`
3. Click "Continuar com Google" button
4. Verify redirect to Google OAuth consent screen
5. Complete OAuth flow and verify redirect back to application

### 4.2 Production Testing

1. Deploy to staging environment first
2. Test OAuth flow on staging domain
3. Verify user creation and authentication
4. Test both sign-up and sign-in flows

## Step 5: Security Considerations

### 5.1 Domain Restrictions

- Ensure redirect URLs are restricted to your domains only
- Do not use wildcard domains in production
- Regularly review authorized domains

### 5.2 Client Secret Security

- Never expose Client Secret in frontend code
- Store Client Secret securely in Supabase only
- Rotate credentials periodically

### 5.3 OAuth Scopes

- Request minimal necessary scopes
- Review scope permissions regularly
- Document why each scope is needed

## Troubleshooting

### Common Issues

1. **Redirect URI Mismatch**
   - Verify redirect URLs in Google Cloud Console match exactly
   - Check for trailing slashes and protocol (http vs https)

2. **Client ID Not Found**
   - Verify environment variable is set correctly
   - Check that the Client ID is from the correct Google project

3. **OAuth Consent Screen Issues**
   - Ensure OAuth consent screen is properly configured
   - Verify application is not in testing mode for production use

4. **Supabase Configuration**
   - Verify Google provider is enabled in Supabase
   - Check that Client ID and Secret match Google Cloud Console

### Debug Steps

1. Check browser developer tools for console errors
2. Verify network requests to OAuth endpoints
3. Check Supabase Auth logs for error details
4. Test OAuth flow in incognito mode

## Maintenance

### Regular Tasks

1. **Monthly**: Review OAuth usage and error logs
2. **Quarterly**: Rotate Client Secret if needed
3. **Annually**: Review and update OAuth consent screen information

### Monitoring

- Monitor OAuth success/failure rates
- Track user authentication patterns
- Set up alerts for OAuth-related errors

## Support

For issues with this setup:
1. Check Supabase documentation for OAuth providers
2. Review Google OAuth 2.0 documentation
3. Contact development team for application-specific issues