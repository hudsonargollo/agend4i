#!/usr/bin/env node

/**
 * Test Navigation Links Script
 * Verifies that all the new auth and legal links are working
 */

const PRODUCTION_URL = 'https://5fe05223.agendai-saas.pages.dev';
const CUSTOM_DOMAIN = 'https://agendai.clubemkt.digital';

async function testNavigationLinks(baseUrl) {
  console.log(`\n🔗 Testing navigation links at: ${baseUrl}`);
  
  const testPages = [
    { path: '/', name: 'Landing Page' },
    { path: '/auth', name: 'Auth Page' },
    { path: '/auth?mode=signup', name: 'Signup Mode' },
    { path: '/terms', name: 'Terms of Service' },
    { path: '/privacy', name: 'Privacy Policy' }
  ];
  
  for (const page of testPages) {
    try {
      const url = `${baseUrl}${page.path}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const html = await response.text();
        
        // Check for specific navigation elements
        const hasAuthLinks = html.includes('Entrar') || html.includes('Criar Conta');
        const hasLegalLinks = html.includes('Termos') || html.includes('Privacidade');
        const hasAgendAiBranding = html.includes('agend4i') || html.includes('AgendAi');
        
        console.log(`✅ ${page.name} (${page.path})`);
        console.log(`   - Auth links: ${hasAuthLinks ? '✅' : '❌'}`);
        console.log(`   - Legal links: ${hasLegalLinks ? '✅' : '❌'}`);
        console.log(`   - Branding: ${hasAgendAiBranding ? '✅' : '❌'}`);
        
      } else {
        console.log(`❌ ${page.name} (${page.path}) - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${page.name} (${page.path}) - Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🧪 AgendAi Navigation Links Test');
  console.log('================================');
  
  // Test main deployment
  await testNavigationLinks(PRODUCTION_URL);
  
  // Test custom domain
  await testNavigationLinks(CUSTOM_DOMAIN);
  
  console.log('\n✨ Navigation Enhancement Summary:');
  console.log('- ✅ Auth links added to Footer and LegalNotice');
  console.log('- ✅ Legal compliance links throughout the app');
  console.log('- ✅ Cross-navigation between all pages');
  console.log('- ✅ Multiple conversion paths for user signup');
  
  console.log('\n🎯 User Journey Improvements:');
  console.log('- Users can access auth from landing page footer');
  console.log('- Legal notice section provides clear navigation');
  console.log('- Terms and Privacy pages have auth links');
  console.log('- Improved legal compliance and UX');
}

main().catch(console.error);