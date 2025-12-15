#!/usr/bin/env node

import { GitHubDeploymentStatusReporter, createGitHubReporterFromEnv } from '../src/lib/github-deployment-status.js';

/**
 * CLI script for reporting deployment status to GitHub
 * Usage: node scripts/github-deployment-status.js <command> [options]
 */

function printUsage() {
  console.log('Usage: node scripts/github-deployment-status.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  pending     Report deployment as pending/in-progress');
  console.log('  success     Report successful deployment');
  console.log('  failure     Report failed deployment');
  console.log('  error       Report deployment error');
  console.log('');
  console.log('Options:');
  console.log('  --url=URL                 Deployment URL');
  console.log('  --preview-url=URL         Preview URL (if different from main URL)');
  console.log('  --description=TEXT        Status description');
  console.log('  --error=TEXT              Error message (for failure/error status)');
  console.log('  --build-time=MS           Build time in milliseconds');
  console.log('  --deploy-time=MS          Deploy time in milliseconds');
  console.log('  --environment=ENV         Environment (production, staging, preview)');
  console.log('  --create-deployment       Create GitHub deployment record');
  console.log('  --owner=OWNER             GitHub repository owner');
  console.log('  --repo=REPO               GitHub repository name');
  console.log('  --token=TOKEN             GitHub token');
  console.log('  --sha=SHA                 Git commit SHA');
  console.log('  --pr=NUMBER               Pull request number');
  console.log('  --help                    Show this help message');
  console.log('');
  console.log('Environment Variables:');
  console.log('  GITHUB_REPOSITORY_OWNER   GitHub repository owner');
  console.log('  GITHUB_REPOSITORY         GitHub repository (owner/repo)');
  console.log('  GITHUB_TOKEN              GitHub token');
  console.log('  GITHUB_SHA                Git commit SHA');
  console.log('  GITHUB_EVENT_NAME         GitHub event name (pull_request, push, etc.)');
  console.log('  GITHUB_EVENT_NUMBER       GitHub event number (PR number)');
  console.log('  DEPLOYMENT_ENVIRONMENT    Deployment environment');
  console.log('');
  console.log('Examples:');
  console.log('  # Report pending deployment (using env vars)');
  console.log('  node scripts/github-deployment-status.js pending --description="Starting deployment"');
  console.log('');
  console.log('  # Report successful deployment with URL');
  console.log('  node scripts/github-deployment-status.js success \\');
  console.log('    --url="https://agendai.clubemkt.digital" \\');
  console.log('    --description="Deployment completed successfully" \\');
  console.log('    --build-time=45000 --deploy-time=30000');
  console.log('');
  console.log('  # Report deployment failure');
  console.log('  node scripts/github-deployment-status.js failure \\');
  console.log('    --description="Build failed" \\');
  console.log('    --error="TypeScript compilation error in src/components/App.tsx"');
  console.log('');
  console.log('  # Manual configuration (not using env vars)');
  console.log('  node scripts/github-deployment-status.js success \\');
  console.log('    --owner=myorg --repo=myrepo --token=ghp_xxx --sha=abc123 \\');
  console.log('    --url="https://example.com" --environment=production');
}

function parseArgs(args) {
  const result = {
    command: args[0],
    options: {}
  };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help') {
      result.options.help = true;
    } else if (arg === '--create-deployment') {
      result.options.createDeployment = true;
    } else if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      if (value !== undefined) {
        // Handle numeric values
        if (key === 'build-time' || key === 'deploy-time' || key === 'pr') {
          result.options[key] = parseInt(value);
        } else {
          result.options[key] = value;
        }
      } else {
        result.options[key] = true;
      }
    }
  }

  return result;
}

function createReporterFromArgs(options) {
  // Try to use environment variables first
  const envReporter = createGitHubReporterFromEnv();
  if (envReporter && !options.owner && !options.repo) {
    return envReporter;
  }

  // Use manual configuration
  const owner = options.owner || process.env.GITHUB_REPOSITORY_OWNER;
  const repo = options.repo || (process.env.GITHUB_REPOSITORY?.split('/')[1]);
  const token = options.token || process.env.GITHUB_TOKEN;
  const sha = options.sha || process.env.GITHUB_SHA;

  if (!owner || !repo || !token || !sha) {
    throw new Error('Missing required GitHub configuration. Provide --owner, --repo, --token, --sha or set environment variables.');
  }

  const environment = (options.environment || process.env.DEPLOYMENT_ENVIRONMENT || 'production');
  const pullRequestNumber = options.pr || (
    process.env.GITHUB_EVENT_NAME === 'pull_request' 
      ? parseInt(process.env.GITHUB_EVENT_NUMBER || '0') || undefined
      : undefined
  );

  return new GitHubDeploymentStatusReporter({
    owner,
    repo,
    token,
    sha,
    environment,
    pullRequestNumber,
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const { command, options } = parseArgs(args);

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const validCommands = ['pending', 'success', 'failure', 'error'];
  if (!validCommands.includes(command)) {
    console.error(`❌ Invalid command: ${command}`);
    console.error(`Valid commands: ${validCommands.join(', ')}`);
    process.exit(1);
  }

  try {
    const reporter = createReporterFromArgs(options);
    
    console.log(`📡 Reporting ${command} status to GitHub...`);
    
    const statusOptions = {
      status: command,
      description: options.description || `Deployment ${command}`,
      url: options.url,
      previewUrl: options['preview-url'],
      buildTime: options['build-time'],
      deployTime: options['deploy-time'],
      error: options.error,
      createDeployment: options.createDeployment || false,
    };

    const result = await reporter.reportDeploymentStatus(statusOptions);

    if (result.success) {
      console.log('✅ Successfully reported deployment status to GitHub');
      
      if (result.deploymentId) {
        console.log(`   Deployment ID: ${result.deploymentId}`);
      }
      if (result.statusId) {
        console.log(`   Status ID: ${result.statusId}`);
      }
      if (result.commentId) {
        console.log(`   Comment ID: ${result.commentId}`);
      }
      
      process.exit(0);
    } else {
      console.error('❌ Failed to report deployment status:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}