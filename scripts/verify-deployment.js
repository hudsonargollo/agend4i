#!/usr/bin/env node

import { DeploymentVerifier } from '../src/lib/deployment-verifier.js';

/**
 * CLI script for post-deployment verification
 * Usage: node scripts/verify-deployment.js <url> [options]
 */

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node scripts/verify-deployment.js <url> [--skip-spa] [--skip-assets] [--verbose] [--timeout=30000]');
    console.error('');
    console.error('Options:');
    console.error('  --skip-spa      Skip SPA routing verification');
    console.error('  --skip-assets   Skip asset optimization verification');
    console.error('  --verbose       Enable verbose logging');
    console.error('  --timeout=N     Set timeout in milliseconds (default: 30000)');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/verify-deployment.js https://agendai.clubemkt.digital');
    console.error('  node scripts/verify-deployment.js https://staging.agendai.clubemkt.digital --verbose');
    console.error('  node scripts/verify-deployment.js https://example.pages.dev --skip-assets');
    process.exit(1);
  }

  const url = args[0];
  const options = {
    skipSpaRouting: args.includes('--skip-spa'),
    skipAssetOptimization: args.includes('--skip-assets'),
    verbose: args.includes('--verbose'),
    timeout: 30000
  };

  // Parse timeout option
  const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
  if (timeoutArg) {
    const timeoutValue = parseInt(timeoutArg.split('=')[1]);
    if (!isNaN(timeoutValue) && timeoutValue > 0) {
      options.timeout = timeoutValue;
    }
  }

  console.log(`🔍 Verifying deployment: ${url}`);
  console.log(`⚙️  Options: ${JSON.stringify(options, null, 2)}`);
  console.log('');

  try {
    const verifier = new DeploymentVerifier({
      timeout: options.timeout,
      verbose: options.verbose
    });

    const result = await verifier.verify({
      url,
      ...options
    });

    // Display results
    console.log(verifier.formatResults(result));

    // Exit with appropriate code
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Verification script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });
}