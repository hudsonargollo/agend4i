/**
 * Reserved slugs that cannot be used as tenant slugs to prevent routing conflicts
 */
export const RESERVED_SLUGS = [
  'app', 'auth', 'api', 'dashboard', 'onboarding', 
  'settings', 'login', 'register', 'admin', 'public',
  'www', 'mail', 'ftp', 'blog', 'shop', 'store',
  'support', 'help', 'docs', 'status', 'health',
  'well-known', 'robots', 'sitemap', 'favicon'
] as const;

/**
 * Generate a URL-safe slug from a shop name
 */
export function generateSlugFromName(shopName: string): string {
  let slug = shopName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 50); // Limit length
  
  // If the result is empty or too short, generate a fallback
  if (slug.length < 2) {
    return 'loja'; // Default fallback slug meaning "shop" in Portuguese
  }
  
  // If the generated slug is reserved, modify it to make it safe
  if (isReservedSlug(slug)) {
    // Try adding a suffix to make it safe
    const safeSuffixes = ['shop', 'store', 'biz', 'pro'];
    for (const suffix of safeSuffixes) {
      const modifiedSlug = `${slug}-${suffix}`;
      if (!isReservedSlug(modifiedSlug) && modifiedSlug.length <= 50) {
        return modifiedSlug;
      }
    }
    
    // If all suffixes are also reserved (unlikely), add a number
    for (let i = 1; i <= 99; i++) {
      const numberedSlug = `${slug}${i}`;
      if (!isReservedSlug(numberedSlug) && numberedSlug.length <= 50) {
        return numberedSlug;
      }
    }
    
    // Final fallback if everything else fails
    return 'loja';
  }
  
  return slug;
}

/**
 * Check if a slug is reserved (case-insensitive)
 */
export function isReservedSlug(slug: string): boolean {
  const normalizedSlug = slug.toLowerCase();
  return RESERVED_SLUGS.includes(normalizedSlug as any);
}

/**
 * Validate slug format (alphanumeric and hyphens only, no leading/trailing hyphens)
 */
export function isValidSlugFormat(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && 
         slug.length >= 2 && 
         slug.length <= 50 &&
         !slug.startsWith('-') &&
         !slug.endsWith('-');
}

/**
 * Generate alternative slug suggestions when the preferred one is taken
 */
export function generateSlugAlternatives(baseSlug: string): string[] {
  const alternatives: string[] = [];
  
  // Add numbered alternatives
  for (let i = 1; i <= 5; i++) {
    alternatives.push(`${baseSlug}${i}`);
    alternatives.push(`${baseSlug}-${i}`);
  }
  
  // Add common suffixes
  const suffixes = ['shop', 'store', 'biz', 'pro', 'plus'];
  suffixes.forEach(suffix => {
    alternatives.push(`${baseSlug}-${suffix}`);
  });
  
  return alternatives.filter(alt => 
    isValidSlugFormat(alt) && !isReservedSlug(alt)
  ).slice(0, 5);
}