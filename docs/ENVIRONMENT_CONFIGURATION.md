# Environment Configuration Guide

This document explains how to configure the domain settings for different deployment environments.

## Environment Variables

### VITE_APP_DOMAIN

The `VITE_APP_DOMAIN` environment variable allows you to override the default domain configuration for any environment.

**Format:** `domain[:port]`

**Examples:**
- `agendai.clubemkt.digital` (production)
- `staging.agendai.clubemkt.digital` (staging)
- `localhost:8080` (development)
- `dev.example.com:3000` (custom development setup)

### VITE_ENVIRONMENT

The `VITE_ENVIRONMENT` variable explicitly sets the environment type, which affects default domain resolution when `VITE_APP_DOMAIN` is not set.

**Values:**
- `development` - Uses localhost:8080 by default
- `staging` - Uses staging.agendai.clubemkt.digital by default
- `production` - Uses agendai.clubemkt.digital by default

## Environment Files

### .env (Base Configuration)
Contains shared configuration and production defaults. This file is committed to the repository.

### .env.development
Used automatically when running `npm run dev`. Contains development-specific overrides.

### .env.staging
Used when building for staging environment. Set the mode with `vite build --mode staging`.

### .env.production
Used when building for production environment. Set the mode with `vite build --mode production`.

### .env.local (Not tracked)
For local overrides that should not be committed to the repository. This file takes precedence over other environment files.

## Usage Examples

### Development
```bash
# Start development server (uses .env.development automatically)
npm run dev

# Or override domain for development
VITE_APP_DOMAIN=localhost:3000 npm run dev
```

### Staging Deployment
```bash
# Build for staging
npm run build -- --mode staging

# Or with custom domain
VITE_APP_DOMAIN=test.agendai.clubemkt.digital npm run build -- --mode staging
```

### Production Deployment
```bash
# Build for production (default)
npm run build

# Or with explicit mode
npm run build -- --mode production
```

### Custom Environment
```bash
# Use custom domain for any environment
VITE_APP_DOMAIN=custom.domain.com npm run build
```

## Environment Priority

Environment variables are loaded in the following order (later values override earlier ones):

1. `.env` (base configuration)
2. `.env.[mode]` (environment-specific)
3. `.env.local` (local overrides, not tracked)
4. `.env.[mode].local` (local environment-specific, not tracked)
5. System environment variables (highest priority)

## Domain Resolution Logic

The application resolves domains using this hierarchy:

1. **VITE_APP_DOMAIN** environment variable (highest priority)
2. **Environment detection** based on hostname and VITE_ENVIRONMENT
3. **Default configuration** based on detected environment:
   - Development: `localhost:8080`
   - Staging: `staging.agendai.clubemkt.digital`
   - Production: `agendai.clubemkt.digital`

## Validation

The domain configuration service automatically validates:
- URL format and structure
- Protocol selection (http for localhost, https for others)
- Port handling for development environments
- Tenant slug and admin path generation

## Troubleshooting

### Domain not updating
1. Check if the correct environment file is being loaded
2. Verify environment variable syntax (no quotes in .env files)
3. Restart the development server after changing environment files
4. Check browser console for domain configuration logs

### Build issues
1. Ensure the correct mode is specified: `--mode staging`
2. Verify environment-specific files exist and have correct syntax
3. Check that VITE_APP_DOMAIN format is valid (domain:port)

### URL generation problems
1. Verify the domain service is being used instead of hardcoded strings
2. Check that tenant slugs and paths are properly formatted
3. Ensure the environment detection is working correctly