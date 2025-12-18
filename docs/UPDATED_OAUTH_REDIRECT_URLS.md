# Updated OAuth Redirect URLs

## Current Deployment URLs

**Latest Deployment**: https://7b6add77.agendai-saas.pages.dev
**Custom Domain**: https://agendai.clubemkt.digital

## Google OAuth Client Configuration

Add these **exact URLs** to your Google Cloud Console OAuth client's authorized redirect URIs:

### Development
```
http://localhost:8080/auth/callback
```

### Production Deployments
```
https://7b6add77.agendai-saas.pages.dev/auth/callback
https://agendai.clubemkt.digital/auth/callback
```

### Supabase Callback
```
https://jiekzfipiwhlhhkmzuvr.supabase.co/auth/v1/callback
```

## Complete List for Google Cloud Console

Copy and paste these URLs into your Google OAuth client:

```
http://localhost:8080/auth/callback
https://7b6add77.agendai-saas.pages.dev/auth/callback
https://agendai.clubemkt.digital/auth/callback
https://jiekzfipiwhlhhkmzuvr.supabase.co/auth/v1/callback
```

## Google OAuth Consent Screen Branding

Update these URLs in your OAuth consent screen:

**Application home page:**
```
https://agendai.clubemkt.digital
```

**Application privacy policy link:**
```
https://agendai.clubemkt.digital/privacy
```

**Application terms of service link:**
```
https://agendai.clubemkt.digital/terms
```

## Testing

After updating the OAuth configuration:

1. Test development: http://localhost:8080/auth
2. Test production: https://agendai.clubemkt.digital/auth
3. Verify OAuth flow works end-to-end
4. Check that all navigation links work properly

## Navigation Enhancements Deployed

✅ **Footer Links**: Login, Signup, Terms, Privacy
✅ **Legal Notice**: Comprehensive navigation section
✅ **Terms Page**: Cross-navigation with auth links
✅ **Privacy Page**: Cross-navigation with auth links
✅ **Auth Page**: Legal compliance notice

Your AgendAi application now has comprehensive navigation and is fully deployed! 🚀