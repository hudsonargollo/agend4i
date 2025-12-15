import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { GitHubDeploymentStatusReporter, createGitHubReporterFromEnv } from './github-deployment-status.js';
import { DeploymentErrorHandler, DeploymentError } from './deployment-error-handler.js';

/**
 * Wrangler deployment executor
 * Handles the deployment process with progress feedback and result capture
 */

export interface DeploymentOptions {
  environment?: 'development' | 'staging' | 'production' | 'preview';
  verbose?: boolean;
  dryRun?: boolean;
  reportToGitHub?: boolean;
}

export interface BuildResult {
  success: boolean;
  buildTime: number;
  outputDir?: string;
  error?: string;
  errorReport?: string;
  recoveryActions?: Array<{
    type: 'retry' | 'rollback' | 'manual' | 'skip';
    description: string;
    command?: string;
    automated: boolean;
  }>;
}

export interface DeploymentResult {
  success: boolean;
  deployTime: number;
  url?: string;
  previewUrl?: string;
  deploymentId?: string;
  error?: string;
  errorReport?: string;
  recoveryActions?: Array<{
    type: 'retry' | 'rollback' | 'manual' | 'skip';
    description: string;
    command?: string;
    automated: boolean;
  }>;
  rollbackInfo?: {
    previousDeploymentId?: string;
    previousUrl?: string;
    rollbackAvailable: boolean;
    rollbackCommand?: string;
  };
}

export interface CompleteDeploymentResult {
  success: boolean;
  buildTime: number;
  deployTime: number;
  totalTime: number;
  url?: string;
  previewUrl?: string;
  deploymentId?: string;
  environment: string;
  stage?: 'build' | 'deploy';
  error?: string;
}

export interface ParsedDeploymentOutput {
  url: string | null;
  previewUrl: string | null;
  deploymentId: string | null;
}

export class DeploymentExecutor {
  private environment: string;
  private verbose: boolean;
  private dryRun: boolean;
  private reportToGitHub: boolean;
  private githubReporter: GitHubDeploymentStatusReporter | null;
  private errorHandler: DeploymentErrorHandler;

  constructor(options: DeploymentOptions = {}) {
    this.environment = options.environment || 'production';
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
    this.reportToGitHub = options.reportToGitHub ?? true; // Default to true
    this.githubReporter = this.reportToGitHub ? createGitHubReporterFromEnv() : null;
    this.errorHandler = new DeploymentErrorHandler({ 
      verbose: this.verbose,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 30000,
        backoffMultiplier: 2
      }
    });
    
    if (this.reportToGitHub && !this.githubReporter) {
      this.log('GitHub status reporting disabled: missing environment variables', 'warning');
      this.reportToGitHub = false;
    }
  }

  private log(message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Execute the build process for the specified environment
   */
  async executeBuild(): Promise<BuildResult> {
    this.log(`Building application for ${this.environment} environment...`);
    
    return this.errorHandler.withRetry(async () => {
      const buildCommand = `npm run build:${this.environment}`;
      
      if (this.dryRun) {
        this.log(`[DRY RUN] Would execute: ${buildCommand}`);
        return { success: true, buildTime: 0 };
      }

      const startTime = Date.now();
      
      try {
        if (this.verbose) {
          execSync(buildCommand, { 
            stdio: 'inherit', 
            cwd: process.cwd(),
            encoding: 'utf8'
          });
        } else {
          const output = execSync(buildCommand, { 
            cwd: process.cwd(),
            encoding: 'utf8'
          });
          this.log('Build completed successfully');
          if (this.verbose) {
            console.log(output);
          }
        }
        
        const buildTime = Date.now() - startTime;
        
        // Verify build output exists
        const distPath = join(process.cwd(), 'dist');
        if (!existsSync(distPath)) {
          throw new Error('Build output directory "dist" not found after build');
        }

        // Check for essential files
        const indexPath = join(distPath, 'index.html');
        if (!existsSync(indexPath)) {
          throw new Error('index.html not found in build output');
        }

        this.log(`Build completed in ${buildTime}ms`, 'success');
        return { 
          success: true, 
          buildTime,
          outputDir: distPath
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`Build failed: ${errorMessage}`, 'error');
        
        // Handle build error with comprehensive error handling
        const errorInfo = await this.errorHandler.handleDeploymentError(error as Error, 'build');
        
        throw new Error(`Build failed: ${errorMessage}\n\nRecovery options available. Run with --verbose for detailed error report.`);
      }
    }, 'Build Process', 'build').catch(async (error) => {
      // If all retries failed, provide comprehensive error information
      const errorInfo = await this.errorHandler.handleDeploymentError(error, 'build');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        buildTime: 0,
        errorReport: errorInfo.report,
        recoveryActions: errorInfo.recoveryActions
      };
    });
  }

  /**
   * Execute Wrangler deployment with progress feedback
   */
  async executeDeployment(): Promise<DeploymentResult> {
    this.log(`Deploying to Cloudflare Pages (${this.environment})...`);
    
    return this.errorHandler.withRetry(async () => {
      const deployCommand = this.environment === 'preview' 
        ? 'wrangler pages deploy dist'
        : `wrangler pages deploy dist --env ${this.environment}`;
      
      if (this.dryRun) {
        this.log(`[DRY RUN] Would execute: ${deployCommand}`);
        return {
          success: true,
          deployTime: 0,
          url: `https://example-${this.environment}.pages.dev`,
          deploymentId: 'dry-run-deployment-id'
        };
      }

      const startTime = Date.now();
      let deploymentOutput = '';
      
      try {
        // Execute deployment and capture output
        try {
          deploymentOutput = execSync(deployCommand, {
            cwd: process.cwd(),
            encoding: 'utf8',
            stdio: this.verbose ? 'inherit' : 'pipe'
          });
        } catch (error: any) {
          // Wrangler might return non-zero exit code even on success in some cases
          // Check if the output contains success indicators
          deploymentOutput = error.stdout || error.message;
          if (!deploymentOutput.includes('✨') && !deploymentOutput.includes('Success')) {
            throw error;
          }
        }
        
        const deployTime = Date.now() - startTime;
        
        // Parse deployment result from output
        const result = this.parseDeploymentOutput(deploymentOutput);
        
        this.log(`Deployment completed in ${deployTime}ms`, 'success');
        if (result.url) {
          this.log(`🌐 Application URL: ${result.url}`, 'success');
        }
        if (result.previewUrl && result.previewUrl !== result.url) {
          this.log(`🔗 Preview URL: ${result.previewUrl}`, 'info');
        }
        
        // Record successful deployment
        if (result.deploymentId && result.url) {
          this.errorHandler.recordDeployment(result.deploymentId, result.url, true);
        }
        
        return {
          success: true,
          deployTime,
          ...result
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.log(`Deployment failed: ${errorMessage}`, 'error');
        
        // Record failed deployment
        this.errorHandler.recordDeployment('failed-' + Date.now(), '', false);
        
        throw error;
      }
    }, 'Deployment Process', 'deployment').catch(async (error) => {
      // If all retries failed, provide comprehensive error information
      const errorInfo = await this.errorHandler.handleDeploymentError(error, 'deployment');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        deployTime: 0,
        errorReport: errorInfo.report,
        recoveryActions: errorInfo.recoveryActions,
        rollbackInfo: errorInfo.rollbackInfo
      };
    });
  }

  /**
   * Parse Wrangler deployment output to extract URLs and deployment ID
   */
  parseDeploymentOutput(output: string): ParsedDeploymentOutput {
    const result: ParsedDeploymentOutput = {
      url: null,
      previewUrl: null,
      deploymentId: null
    };

    // Extract URLs from Wrangler output
    const urlPatterns = [
      /https:\/\/[a-zA-Z0-9-]+\.pages\.dev/g,
      /https:\/\/[a-zA-Z0-9.-]+\.clubemkt\.digital/g,
      /https:\/\/agendai\.clubemkt\.digital/g,
      /https:\/\/staging\.agendai\.clubemkt\.digital/g
    ];

    const foundUrls: string[] = [];
    for (const pattern of urlPatterns) {
      const matches = output.match(pattern);
      if (matches) {
        foundUrls.push(...matches);
      }
    }

    // Remove duplicates and sort by preference (custom domain first)
    const uniqueUrls = [...new Set(foundUrls)];
    const customDomainUrls = uniqueUrls.filter(url => url.includes('clubemkt.digital'));
    const pagesDevUrls = uniqueUrls.filter(url => url.includes('pages.dev'));

    // Prefer custom domain for main URL
    if (customDomainUrls.length > 0) {
      result.url = customDomainUrls[0];
      if (pagesDevUrls.length > 0) {
        result.previewUrl = pagesDevUrls[0];
      }
    } else if (pagesDevUrls.length > 0) {
      result.url = pagesDevUrls[0];
    }

    // Extract deployment ID if available
    const deploymentIdMatch = output.match(/Deployment ID: ([a-f0-9-]+)/i) || 
                             output.match(/deployment-id[:\s]+([a-f0-9-]+)/i);
    if (deploymentIdMatch) {
      result.deploymentId = deploymentIdMatch[1];
    }

    return result;
  }

  /**
   * Execute complete deployment process (build + deploy)
   */
  async deploy(): Promise<CompleteDeploymentResult> {
    this.log(`Starting deployment process for ${this.environment}...`);
    
    const startTime = Date.now();
    
    // Report deployment as pending to GitHub
    if (this.githubReporter && !this.dryRun) {
      try {
        await this.githubReporter.reportDeploymentStatus({
          status: 'pending',
          description: `Starting deployment to ${this.environment}`,
          createDeployment: true,
        });
        this.log('📡 Reported pending status to GitHub', 'info');
      } catch (error) {
        this.log(`Failed to report pending status to GitHub: ${error instanceof Error ? error.message : String(error)}`, 'warning');
      }
    }
    
    // Step 1: Build
    const buildResult = await this.executeBuild();
    if (!buildResult.success) {
      const result = {
        success: false,
        stage: 'build' as const,
        error: buildResult.error,
        totalTime: Date.now() - startTime,
        buildTime: buildResult.buildTime,
        deployTime: 0,
        environment: this.environment
      };

      // Report build failure to GitHub
      if (this.githubReporter && !this.dryRun) {
        try {
          await this.githubReporter.reportDeploymentStatus({
            status: 'failure',
            description: 'Build failed',
            error: buildResult.error,
          });
          this.log('📡 Reported build failure to GitHub', 'info');
        } catch (error) {
          this.log(`Failed to report build failure to GitHub: ${error instanceof Error ? error.message : String(error)}`, 'warning');
        }
      }

      return result;
    }

    // Step 2: Deploy
    const deployResult = await this.executeDeployment();
    if (!deployResult.success) {
      const result = {
        success: false,
        stage: 'deploy' as const,
        error: deployResult.error,
        buildTime: buildResult.buildTime,
        deployTime: deployResult.deployTime,
        totalTime: Date.now() - startTime,
        environment: this.environment
      };

      // Report deployment failure to GitHub
      if (this.githubReporter && !this.dryRun) {
        try {
          await this.githubReporter.reportDeploymentStatus({
            status: 'failure',
            description: 'Deployment failed',
            error: deployResult.error,
            buildTime: buildResult.buildTime,
          });
          this.log('📡 Reported deployment failure to GitHub', 'info');
        } catch (error) {
          this.log(`Failed to report deployment failure to GitHub: ${error instanceof Error ? error.message : String(error)}`, 'warning');
        }
      }

      return result;
    }

    const totalTime = Date.now() - startTime;
    
    this.log(`🎉 Deployment completed successfully in ${totalTime}ms`, 'success');
    
    const result = {
      success: true,
      buildTime: buildResult.buildTime,
      deployTime: deployResult.deployTime,
      totalTime,
      url: deployResult.url,
      previewUrl: deployResult.previewUrl,
      deploymentId: deployResult.deploymentId,
      environment: this.environment
    };

    // Report successful deployment to GitHub
    if (this.githubReporter && !this.dryRun) {
      try {
        await this.githubReporter.reportDeploymentStatus({
          status: 'success',
          description: 'Deployment completed successfully',
          url: deployResult.url,
          previewUrl: deployResult.previewUrl,
          buildTime: buildResult.buildTime,
          deployTime: deployResult.deployTime,
        });
        this.log('📡 Reported successful deployment to GitHub', 'success');
      } catch (error) {
        this.log(`Failed to report success to GitHub: ${error instanceof Error ? error.message : String(error)}`, 'warning');
      }
    }
    
    return result;
  }

  /**
   * Execute complete deployment process with verification (build + deploy + verify)
   */
  async deployWithVerification(): Promise<CompleteDeploymentResult & { verification?: any }> {
    const deployResult = await this.deploy();
    
    if (!deployResult.success || !deployResult.url) {
      return deployResult;
    }

    // Import verifier dynamically to avoid circular dependencies
    try {
      const { DeploymentVerifier } = await import('./deployment-verifier');
      const verifier = new DeploymentVerifier({ verbose: this.verbose });
      
      this.log('Starting post-deployment verification...');
      const verificationResult = await verifier.verify({
        url: deployResult.url,
        timeout: 30000
      });
      
      if (verificationResult.success) {
        this.log('✅ Post-deployment verification passed', 'success');
      } else {
        this.log('❌ Post-deployment verification failed', 'error');
        if (this.verbose) {
          console.log(verifier.formatResults(verificationResult));
        }
      }
      
      return {
        ...deployResult,
        verification: verificationResult
      };
    } catch (error) {
      this.log(`Verification failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      return {
        ...deployResult,
        verification: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Get deployment status from Cloudflare
   */
  async getDeploymentStatus(deploymentId: string): Promise<{
    id: string;
    status: string;
    timestamp: string;
    error?: string;
  }> {
    if (!deploymentId) {
      throw new Error('Deployment ID is required');
    }

    try {
      const output = execSync(`wrangler pages deployment list --limit 1`, {
        cwd: process.cwd(),
        encoding: 'utf8'
      });

      // Parse the output to find deployment status
      // This is a simplified implementation - in practice, you'd want more robust parsing
      const isActive = output.includes(deploymentId) && output.includes('Active');
      
      return {
        id: deploymentId,
        status: isActive ? 'active' : 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Failed to get deployment status: ${errorMessage}`, 'error');
      return {
        id: deploymentId,
        status: 'error',
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Attempt to rollback to previous successful deployment
   */
  async rollback(): Promise<{
    success: boolean;
    message: string;
    previousUrl?: string;
  }> {
    this.log('Initiating deployment rollback...', 'warning');
    
    try {
      const rollbackResult = await this.errorHandler.rollback();
      
      if (rollbackResult.success) {
        this.log('Rollback completed successfully', 'success');
        
        // Report rollback to GitHub if configured
        if (this.githubReporter && !this.dryRun) {
          try {
            await this.githubReporter.reportDeploymentStatus({
              status: 'success',
              description: 'Rollback completed successfully',
              url: rollbackResult.message.includes('https://') ? 
                rollbackResult.message.match(/https:\/\/[^\s]+/)?.[0] : undefined,
            });
          } catch (error) {
            this.log(`Failed to report rollback to GitHub: ${error instanceof Error ? error.message : String(error)}`, 'warning');
          }
        }
      } else {
        this.log(`Rollback failed: ${rollbackResult.message}`, 'error');
      }
      
      return rollbackResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Rollback operation failed: ${errorMessage}`, 'error');
      
      return {
        success: false,
        message: `Rollback operation failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(): Array<{ id: string; url: string; timestamp: Date; success: boolean }> {
    return this.errorHandler.getDeploymentHistory();
  }

  /**
   * Get comprehensive error report for the last error
   */
  getLastErrorReport(): string | null {
    // This would need to be implemented to store the last error
    // For now, return null as this is a placeholder
    return null;
  }
}