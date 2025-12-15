# Design Document: Cloudflare Pages Deployment

## Overview

This design implements automated deployment of the React SaaS application to Cloudflare Pages using Wrangler CLI with GitHub Actions integration for continuous deployment. The solution integrates with the existing Vite build system and provides both manual deployment capabilities and automatic deployment triggered by GitHub commits. The system handles environment configuration, build optimization, deployment verification, and Git-based deployment workflows.

## Architecture

The deployment system follows a dual-pipeline architecture supporting both manual and automated deployment:

### Manual Deployment Pipeline
1. **Pre-deployment validation** - Verify Wrangler installation and environment configuration
2. **Build process** - Execute Vite production build with optimizations
3. **Asset preparation** - Configure routing and environment-specific settings
4. **Deployment execution** - Upload to Cloudflare Pages via Wrangler
5. **Post-deployment verification** - Validate successful deployment and provide feedback

### Automated GitHub Deployment Pipeline
1. **Git trigger detection** - GitHub Actions workflow triggered by commits to specified branches
2. **Environment setup** - Install Node.js, dependencies, and Wrangler in CI environment
3. **Automated build** - Execute production build with environment-specific configuration
4. **Automated deployment** - Deploy to Cloudflare Pages using stored secrets
5. **Status reporting** - Report deployment status back to GitHub and notify relevant parties

The system integrates with the existing project structure without modifying core application code, using configuration files, npm scripts, and GitHub Actions workflows to orchestrate both deployment approaches.

## Components and Interfaces

### Wrangler Configuration (`wrangler.toml`)
- Defines Cloudflare Pages project settings with custom domain `agendai.clubemkt.digital`
- Configures build commands and output directory
- Specifies environment variables and routing rules for tenant-based paths
- Manages compatibility settings for optimal performance
- Sets up custom domain routing for `agendai.clubemkt.digital/{tenant}` pattern

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
- **Trigger configuration** - Defines branch-based deployment triggers (main for production, develop for staging)
- **Environment matrix** - Supports multiple deployment environments with different configurations
- **Secret management** - Securely handles Cloudflare API tokens and environment variables
- **Build and deploy steps** - Orchestrates the complete CI/CD pipeline
- **Status notifications** - Reports deployment results and provides deployment URLs

### Deployment Scripts
- **Pre-deployment validator** - Checks prerequisites and environment setup
- **Build orchestrator** - Executes Vite build with production optimizations
- **Deployment executor** - Handles Wrangler deployment with error handling
- **Post-deployment verifier** - Validates deployment success and provides URLs

### Environment Configuration
- **Production environment variables** - Supabase configuration for production with domain `agendai.clubemkt.digital`
- **Staging environment variables** - Separate configuration for staging deployments
- **Build-time variables** - Vite-specific configuration for Cloudflare Pages with custom domain
- **Runtime configuration** - SPA routing for tenant-based paths (`/{tenant}`) and admin interface (`/app`)
- **Custom domain configuration** - DNS and SSL setup for `agendai.clubemkt.digital`
- **GitHub Secrets** - Secure storage of API tokens and sensitive configuration

### Integration Points
- **Package.json scripts** - New deployment commands integrated with existing scripts
- **Vite configuration** - Enhanced for Cloudflare Pages compatibility
- **Environment files** - Production and staging-specific environment variable management
- **GitHub repository settings** - Branch protection rules and deployment environments
- **Cloudflare Pages project** - Connected to GitHub repository for automatic deployments

## Data Models

### Deployment Configuration
```typescript
interface DeploymentConfig {
  projectName: string;
  buildCommand: string;
  buildOutputDir: string;
  environmentVariables: Record<string, string>;
  routingRules: RoutingRule[];
  compatibilityDate: string;
  gitIntegration?: GitIntegrationConfig;
}

interface GitIntegrationConfig {
  repository: string;
  productionBranch: string;
  stagingBranch?: string;
  autoDeployOnPush: boolean;
  deploymentEnvironments: DeploymentEnvironment[];
}

interface DeploymentEnvironment {
  name: 'production' | 'staging' | 'preview';
  branch: string;
  environmentVariables: Record<string, string>;
  customDomain?: string;
}

interface RoutingRule {
  source: string;
  destination: string;
  status?: number;
}
```

### Build Metadata
```typescript
interface BuildMetadata {
  buildTime: Date;
  buildHash: string;
  environment: 'staging' | 'production';
  viteConfig: ViteConfig;
  assets: AssetManifest;
}

interface AssetManifest {
  entryPoints: string[];
  chunks: string[];
  staticAssets: string[];
  totalSize: number;
}
```

### Deployment Result
```typescript
interface DeploymentResult {
  success: boolean;
  deploymentId: string;
  url: string;
  previewUrl?: string;
  buildTime: number;
  deployTime: number;
  environment: 'production' | 'staging' | 'preview';
  triggeredBy: 'manual' | 'git-push' | 'pull-request';
  commitHash?: string;
  branch?: string;
  errors?: DeploymentError[];
}

interface DeploymentError {
  type: 'build' | 'upload' | 'configuration' | 'git-integration';
  message: string;
  details?: string;
}

interface GitHubActionResult {
  workflowId: string;
  runId: string;
  status: 'success' | 'failure' | 'cancelled';
  deploymentResult?: DeploymentResult;
  logs: string[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Build triggers deployment sequence**
*For any* deployment command execution, the system should complete the build process before attempting to upload assets to Cloudflare Pages
**Validates: Requirements 1.1, 1.2**

**Property 2: Environment variable validation gates deployment**
*For any* deployment configuration, all required environment variables should be validated and deployment should only proceed when all are present and valid
**Validates: Requirements 1.3, 2.4**

**Property 3: Successful deployment provides accessible URL**
*For any* successful deployment, the returned deployment URL should be accessible and serve the application correctly
**Validates: Requirements 1.4, 3.4**

**Property 4: SPA routing configuration correctness**
*For any* deployment configuration, the system should include proper routing rules that enable client-side routing without 404 errors
**Validates: Requirements 2.3**

**Property 5: Production build optimization consistency**
*For any* production build, the generated assets should be optimized for performance and maintain file integrity across deployments
**Validates: Requirements 2.2**

**Property 6: Build failure prevents deployment**
*For any* build process failure, the system should halt deployment and provide clear error information without attempting upload
**Validates: Requirements 3.2**

**Property 7: Multi-environment configuration support**
*For any* environment configuration (staging or production), the system should support independent deployment with environment-specific settings
**Validates: Requirements 2.5**

**Property 8: Vite configuration compatibility**
*For any* existing Vite configuration, the deployment system should work without conflicts and preserve existing build functionality
**Validates: Requirements 4.1, 4.4**

**Property 9: Package.json integration consistency**
*For any* deployment script addition, the system should integrate with existing package.json scripts without breaking current functionality
**Validates: Requirements 4.3**

**Property 10: Deployment failure recovery**
*For any* deployment failure, the system should provide troubleshooting guidance and rollback options without leaving partial deployments
**Validates: Requirements 3.5, 4.5**

**Property 11: Git commit triggers automatic deployment**
*For any* commit pushed to configured branches, the GitHub Actions workflow should automatically trigger the deployment process
**Validates: Requirements 5.1, 5.2**

**Property 12: Branch-based environment mapping**
*For any* configured branch-to-environment mapping, commits to specific branches should deploy to their corresponding environments (production, staging, preview)
**Validates: Requirements 5.3**

**Property 13: GitHub Actions secret security**
*For any* deployment triggered by GitHub Actions, sensitive configuration like API tokens should be securely accessed from GitHub Secrets without exposure in logs
**Validates: Requirements 5.4**

**Property 14: Deployment status reporting**
*For any* GitHub-triggered deployment, the system should report deployment status back to the GitHub commit/pull request with deployment URLs
**Validates: Requirements 5.5**

**Property 15: Custom domain configuration**
*For any* production deployment, the application should be accessible via the custom domain `agendai.clubemkt.digital` with proper SSL certificate
**Validates: Requirements 6.1, 6.4**

**Property 16: Tenant routing consistency**
*For any* valid tenant slug, the URL `agendai.clubemkt.digital/{tenant}` should serve the correct tenant's booking interface
**Validates: Requirements 6.2**

## Error Handling

### Build Errors
- **TypeScript compilation errors** - Display detailed error messages with file locations
- **Asset optimization failures** - Provide fallback strategies and clear diagnostics
- **Dependency resolution issues** - Guide users through dependency conflicts

### Configuration Errors
- **Missing environment variables** - List required variables with example values
- **Invalid Wrangler configuration** - Validate configuration syntax and provide corrections
- **Authentication failures** - Guide through Cloudflare authentication setup

### Deployment Errors
- **Upload failures** - Retry logic with exponential backoff
- **Quota exceeded** - Clear messaging about Cloudflare Pages limits
- **Network connectivity issues** - Offline detection and retry mechanisms

### Recovery Strategies
- **Rollback capabilities** - Ability to revert to previous successful deployment
- **Partial failure handling** - Clean up incomplete deployments
- **Configuration validation** - Pre-flight checks to prevent common issues

## Testing Strategy

### Unit Tests
- Wrangler configuration validation
- Environment variable processing
- Build script execution logic
- Error message formatting and clarity

### Property-Based Tests
- Build process consistency across different project states
- Environment variable validation with various input combinations
- Deployment URL generation and accessibility
- SPA routing configuration correctness
- Asset optimization verification
- Error handling completeness across failure scenarios

The property-based testing will use **fast-check** (already available in the project) to generate random configurations and validate that the deployment system behaves correctly across all scenarios. Each property-based test will run a minimum of 100 iterations to ensure comprehensive coverage.

### Integration Tests
- End-to-end deployment workflow testing
- Cloudflare Pages API integration validation
- Build and deployment pipeline verification
- Environment-specific configuration testing

### Manual Testing Scenarios
- First-time setup experience
- Deployment to staging and production environments
- Error recovery and troubleshooting workflows
- Performance validation of deployed applications