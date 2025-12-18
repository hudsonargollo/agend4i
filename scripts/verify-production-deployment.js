#!/usr/bin/env node

/**
 * Production Deployment Verification Script
 */

const PRODUCTION_URL = 'https://5fe05223.agendai-saas.pages.dev';
const CUSTOM_DOMAIN = 'https://agendai.clubemkt.digital';

async function verifyDeployment(url) {
  console.log(`\n🔍 Verifying deployment at: ${url}`);
  
  try {
    const response = await fetch(url);
    
    if (response.ok) {
      console.log(`✅ ${url} is accessible (Status: ${response.status})`);
      
      // Check if it's the correct app
      const html = await response.text();
      if (html.includes('agend4i') || html.includes('AgendAi')) {
        console.log('✅ App content verified - AgendAi branding found');
      } else {
        console.log('⚠️  App content not verified - AgendAi branding not found');
      }
      
      return true;
    } else {
      console.log(`❌ ${url} returned status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error accessing ${url}: ${error.message}`);
    return false;
  }
}

async function verifyOAuthEndpoints(baseUrl) {
  console.log(`\n🔐 Verifying OAuth endpoints at: ${baseUrl}`);
  
  const endpoints = [
    '/auth',
    '/auth/callback',
    '/privacy',
    '/terms'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url);
      
      if (response.ok) {
        console.log(`✅ ${endpoint} is accessible`);
      } else {
        console.log(`⚠️  ${endpoint} returned status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error accessing ${endpoint}: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 AgendAi Production Deployment Verification');
  console.log('===========================================');
  
  // Verify main deployment
  const mainDeploymentOk = await verifyDeployment(PRODUCTION_URL);
  
  // Verify OAuth endpoints
  if (mainDeploymentOk) {
    await verifyOAuthEndpoints(PRODUCTION_URL);
  }
  
  // Try custom domain if configured
  console.log(`\n🌐 Checking custom domain: ${CUSTOM_DOMAIN}`);
  await verifyDeployment(CUSTOM_DOMAIN);
  
  console.log('\n📋 Next Steps:');
  console.log('1. Add production URLs to Google OAuth redirect URIs');
  console.log('2. Test Google OAuth flow on production');
  console.log('3. Verify all features work correctly');
  console.log('4. Set up custom domain if needed');
  
  console.log('\n🔗 Production URLs:');
  console.log(`   Main: ${PRODUCTION_URL}`);
  console.log(`   Auth: ${PRODUCTION_URL}/auth`);
  console.log(`   Privacy: ${PRODUCTION_URL}/privacy`);
  console.log(`   Terms: ${PRODUCTION_URL}/terms`);
}

main().catch(console.error);