#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Wrangler deployment executor
 * Handles the deployment process with progress feedback and result capture
 */

export class DeploymentExecutor {
  constructor(options = {}) {
    this.environment = options.environment || 'production';
    this.verbose = options.verbose || false;
    this.dryRun = options.dryRun || false;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Execute the build process for the specified environment
   */
  async executeBuild() {
    this.log(`Building application for ${this.environment} environment...`);
    
    try {
      const buildCommand = this.environment === 'preview' ? 'npm run build:preview' : `npm run build:${this.environment}`;
      
      if (this.dryRun) {
        this.log(`[DRY RUN] Would execute: ${buildCommand}`);
        return { success: true, buildTime: 0 };
      }

      const startTime = Date.now();
      
      if (this.verbose) {
        execSync(buildCommand, { 
          stdio: 'inherit', 
          cwd: projectRoot,
          encoding: 'utf8'
        });
      } else {
        const output = execSync(buildCommand, { 
          cwd: projectRoot,
          encoding: 'utf8'
        });
        this.log('Build completed successfully');
        if (this.verbose) {
          console.log(output);
        }
      }
      
      const buildTime = Date.now() - startTime;
      
      // Verify build output exists
      const distPath = join(projectRoot, 'dist');
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
      this.log(`Build failed: ${error.message}`, 'error');
      return { 
        success: false, 
        error: error.message,
        buildTime: 0
      };
    }
  }

  /**
   * Execute Wrangler deployment with progress feedback
   */
  async executeDeployment() {
    this.log(`Deploying to Cloudflare Pages (${this.environment})...`);
    
    try {
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
      
      // Execute deployment and capture output
      try {
        deploymentOutput = execSync(deployCommand, {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: this.verbose ? 'inherit' : 'pipe'
        });
      } catch (error) {
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
      
      return {
        success: true,
        deployTime,
        ...result
      };
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        deployTime: 0
      };
    }
  }

  /**
   * Parse Wrangler deployment output to extract URLs and deployment ID
   */
  parseDeploymentOutput(output) {
    const result = {
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

    const foundUrls = [];
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
  async deploy() {
    this.log(`Starting deployment process for ${this.environment}...`);
    
    const startTime = Date.now();
    
    // Step 1: Build
    const buildResult = await this.executeBuild();
    if (!buildResult.success) {
      return {
        success: false,
        stage: 'build',
        error: buildResult.error,
        totalTime: Date.now() - startTime
      };
    }

    // Step 2: Deploy
    const deployResult = await this.executeDeployment();
    if (!deployResult.success) {
      return {
        success: false,
        stage: 'deploy',
        error: deployResult.error,
        buildTime: buildResult.buildTime,
        totalTime: Date.now() - startTime
      };
    }

    const totalTime = Date.now() - startTime;
    
    this.log(`🎉 Deployment completed successfully in ${totalTime}ms`, 'success');
    
    return {
      success: true,
      buildTime: buildResult.buildTime,
      deployTime: deployResult.deployTime,
      totalTime,
      url: deployResult.url,
      previewUrl: deployResult.previewUrl,
      deploymentId: deployResult.deploymentId,
      environment: this.environment
    };
  }

  /**
   * Get deployment status from Cloudflare
   */
  async getDeploymentStatus(deploymentId) {
    if (!deploymentId) {
      throw new Error('Deployment ID is required');
    }

    try {
      const output = execSync(`wrangler pages deployment list --limit 1`, {
        cwd: projectRoot,
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
      this.log(`Failed to get deployment status: ${error.message}`, 'error');
      return {
        id: deploymentId,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';
  const verbose = args.includes('--verbose') || args.includes('-v');
  const dryRun = args.includes('--dry-run');
  const reportToGitHub = !args.includes('--no-github');
  
  if (!['development', 'staging', 'production', 'preview'].includes(environment)) {
    console.error('❌ Invalid environment. Use: development, staging, production, or preview');
    process.exit(1);
  }

  const executor = new DeploymentExecutor({ environment, verbose, dryRun });
  
  try {
    const result = await executor.deploy();
    
    if (result.success) {
      console.log('\n✅ Deployment Summary:');
      console.log(`   Environment: ${result.environment}`);
      console.log(`   Build Time: ${result.buildTime}ms`);
      console.log(`   Deploy Time: ${result.deployTime}ms`);
      console.log(`   Total Time: ${result.totalTime}ms`);
      if (result.url) {
        console.log(`   URL: ${result.url}`);
      }
      if (result.previewUrl) {
        console.log(`   Preview URL: ${result.previewUrl}`);
      }
      process.exit(0);
    } else {
      console.error(`\n❌ Deployment failed at ${result.stage} stage:`);
      console.error(`   Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Deployment script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Deployment script failed:', error);
    process.exit(1);
  });
}