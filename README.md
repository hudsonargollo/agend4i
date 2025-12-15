# AgendaI - Multi-Tenant Booking Platform

## Project info

**Production Domain**: https://agendai.clubemkt.digital
**Staging Domain**: https://staging.agendai.clubemkt.digital


The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

This project supports multiple deployment methods:

### Cloudflare Pages Deployment

This application is configured for automated deployment to Cloudflare Pages with support for multiple environments.

#### Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI**: Already included as a dev dependency
3. **Node.js**: Version 18 or higher
4. **Environment Variables**: Configured for your deployment target

#### Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Authenticate with Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Deploy to staging**:
   ```bash
   npm run deploy:staging
   ```

4. **Deploy to production**:
   ```bash
   npm run deploy:production
   ```

#### Available Deployment Commands

| Command | Description | Environment |
|---------|-------------|-------------|
| `npm run deploy:staging` | Deploy to staging environment | `staging.agendai.clubemkt.digital` |
| `npm run deploy:production` | Deploy to production environment | `agendai.clubemkt.digital` |
| `npm run deploy:preview` | Deploy preview build | `*.pages.dev` |
| `npm run deploy:staging:verify` | Deploy staging + verify | Includes post-deployment verification |
| `npm run deploy:production:verify` | Deploy production + verify | Includes post-deployment verification |

#### Environment Configuration

The deployment system supports multiple environments with automatic configuration:

**Production Environment**:
- Domain: `agendai.clubemkt.digital`
- Tenant URLs: `agendai.clubemkt.digital/{tenant-slug}`
- Admin Interface: `agendai.clubemkt.digital/app`

**Staging Environment**:
- Domain: `staging.agendai.clubemkt.digital`
- Tenant URLs: `staging.agendai.clubemkt.digital/{tenant-slug}`
- Admin Interface: `staging.agendai.clubemkt.digital/app`

**Required Environment Variables**:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Domain Configuration (optional - auto-detected)
VITE_APP_DOMAIN=agendai.clubemkt.digital
VITE_ENVIRONMENT=production
```

#### Automated GitHub Deployment

The project includes GitHub Actions for automatic deployment:

**Deployment Triggers**:
- Push to `main` branch → Production deployment
- Push to `develop` branch → Staging deployment
- Pull requests → Preview deployment

**Required GitHub Secrets**:
```bash
# Cloudflare API Tokens
CLOUDFLARE_API_TOKEN_PROD      # Production deployments
CLOUDFLARE_API_TOKEN_STAGING   # Staging deployments
CLOUDFLARE_API_TOKEN           # Fallback/preview deployments

# Environment-specific Supabase Configuration
VITE_SUPABASE_URL_PROD
VITE_SUPABASE_PROJECT_ID_PROD
VITE_SUPABASE_PUBLISHABLE_KEY_PROD

VITE_SUPABASE_URL_STAGING
VITE_SUPABASE_PROJECT_ID_STAGING
VITE_SUPABASE_PUBLISHABLE_KEY_STAGING
```

#### Custom Domain Setup

**DNS Configuration**:
1. Add CNAME record: `agendai.clubemkt.digital` → `agendai-saas-production.pages.dev`
2. Add CNAME record: `staging.agendai.clubemkt.digital` → `agendai-saas-staging.pages.dev`
3. SSL certificates are automatically provisioned by Cloudflare

**Domain Verification**:
```bash
# Verify production domain
curl -I https://agendai.clubemkt.digital

# Verify staging domain
curl -I https://staging.agendai.clubemkt.digital
```

#### Validation and Troubleshooting

**Pre-deployment Validation**:
```bash
# Validate environment configuration
npm run env:validate:production
npm run env:validate:staging

# Validate GitHub secrets (if using CI/CD)
npm run secrets:validate:production
npm run secrets:validate:staging

# Validate deployment configuration
npm run validate:deployment production
```

**Build Validation**:
```bash
# Test production build locally
npm run build:production

# Test staging build locally
npm run build:staging

# Verify build output
ls -la dist/
```

**Deployment Verification**:
```bash
# Verify deployment accessibility
npm run verify:deployment https://agendai.clubemkt.digital

# Check deployment status
npx wrangler pages deployment list
```

#### Common Issues and Solutions

**Authentication Issues**:
```bash
# Re-authenticate with Cloudflare
npx wrangler login

# Verify authentication
npx wrangler whoami
```

**Build Failures**:
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build:production
```

**Environment Variable Issues**:
```bash
# List current environment configuration
npm run env:summary

# Validate specific environment
npm run env:validate production
```

**Domain Access Issues**:
- Verify DNS configuration is correct
- Check SSL certificate status in Cloudflare dashboard
- Ensure custom domain is properly configured in Pages project

For detailed troubleshooting, see [Deployment Troubleshooting Guide](docs/DEPLOYMENT_TROUBLESHOOTING.md).

#### Monitoring and Maintenance

**Deployment Status**:
- GitHub Actions provide automated deployment status
- Deployment URLs are reported in commit status checks
- Failed deployments trigger automatic error reporting

**Performance Monitoring**:
- Cloudflare Analytics available in dashboard
- Build times and deployment metrics tracked
- Asset optimization automatically applied

**Security**:
- API tokens stored securely in GitHub Secrets
- Environment-specific token isolation
- Automatic SSL certificate management

## Domain Configuration

This application uses environment-aware domain configuration to support different deployment environments:

- **Development**: `localhost:8080` (local development)
- **Staging**: `staging.agendai.clubemkt.digital` (testing environment)
- **Production**: `agendai.clubemkt.digital` (live environment)

### Environment Variables

Configure the domain using the `VITE_APP_DOMAIN` environment variable:

```bash
# Development with custom port
VITE_APP_DOMAIN=localhost:3000 npm run dev

# Staging deployment
VITE_APP_DOMAIN=staging.agendai.clubemkt.digital npm run build

# Production deployment (default)
npm run build
```

For detailed configuration options, see [Environment Configuration Guide](docs/ENVIRONMENT_CONFIGURATION.md).

### Domain Migration

This application recently migrated from `agendai.online` to `agendai.clubemkt.digital`. For migration information and updating external integrations, see [Domain Migration Guide](docs/DOMAIN_MIGRATION.md).


