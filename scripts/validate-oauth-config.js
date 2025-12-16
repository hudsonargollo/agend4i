#!/usr/bin/env node

/**
 * OAuth Configuration Validation Script
 * 
 * This script validates that Google OAuth is properly configured
 * across all environment files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILES = [
  '.env',
  '.env.development',
  '.env.production',
  '.env.staging'
];

const REQUIRED_VARS = [
  'VITE_GOOGLE_CLIENT_ID',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_APP_DOMAIN'
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return vars;
}

function validateEnvironment(envFile) {
  console.log(`\n📋 Validating ${envFile}:`);
  
  const vars = parseEnvFile(envFile);
  if (!vars) {
    console.log('  ❌ File not found');
    return false;
  }

  let isValid = true;
  
  REQUIRED_VARS.forEach(varName => {
    const value = vars[varName];
    if (!value) {
      console.log(`  ❌ ${varName}: Not set`);
      isValid = false;
    } else if (value === 'your_google_client_id_here') {
      console.log(`  ⚠️  ${varName}: Placeholder value detected`);
      isValid = false;
    } else if (varName === 'VITE_GOOGLE_CLIENT_ID' && !value.includes('.apps.googleusercontent.com')) {
      console.log(`  ⚠️  ${varName}: Invalid format (should end with .apps.googleusercontent.com)`);
      isValid = false;
    } else {
      console.log(`  ✅ ${varName}: Configured`);
    }
  });

  return isValid;
}

function generateRedirectUrls() {
  console.log('\n🔗 Required OAuth Redirect URLs:');
  console.log('\nAdd these URLs to your Google Cloud Console OAuth client:');
  
  ENV_FILES.forEach(envFile => {
    const vars = parseEnvFile(envFile);
    if (vars && vars.VITE_APP_DOMAIN) {
      const domain = vars.VITE_APP_DOMAIN;
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      const appCallback = `${protocol}://${domain}/auth/callback`;
      console.log(`  ${envFile}: ${appCallback}`);
    }
  });

  // Supabase callback URL
  const vars = parseEnvFile('.env');
  if (vars && vars.VITE_SUPABASE_URL) {
    console.log(`  Supabase: ${vars.VITE_SUPABASE_URL}/auth/v1/callback`);
  }
}

function main() {
  console.log('🔐 Google OAuth Configuration Validator');
  console.log('=====================================');

  let allValid = true;

  ENV_FILES.forEach(envFile => {
    const isValid = validateEnvironment(envFile);
    if (!isValid) {
      allValid = false;
    }
  });

  generateRedirectUrls();

  console.log('\n📚 Setup Instructions:');
  console.log('  1. See docs/GOOGLE_OAUTH_SETUP.md for detailed setup guide');
  console.log('  2. Configure Google OAuth client in Google Cloud Console');
  console.log('  3. Enable Google provider in Supabase Dashboard');
  console.log('  4. Update environment variables with actual values');

  if (allValid) {
    console.log('\n✅ All OAuth configurations are valid!');
    process.exit(0);
  } else {
    console.log('\n❌ OAuth configuration issues found. Please fix the issues above.');
    process.exit(1);
  }
}

// Run the main function
main();

export { validateEnvironment, parseEnvFile };