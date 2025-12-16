import { supabase } from '@/integrations/supabase/client';

export interface SlugValidationResult {
  available: boolean;
  error?: string;
  suggestions?: string[];
}

/**
 * Validate slug using the database function for comprehensive checking
 */
export async function validateSlugAvailability(slug: string): Promise<SlugValidationResult> {
  try {
    const { data, error } = await supabase.rpc('validate_tenant_slug', {
      slug_candidate: slug
    });

    if (error) {
      console.error('Error validating slug:', error);
      return {
        available: false,
        error: 'Erro ao verificar disponibilidade do link'
      };
    }

    return {
      available: data.available,
      error: data.error || undefined,
      suggestions: data.suggestions || []
    };
  } catch (error) {
    console.error('Error in slug validation service:', error);
    return {
      available: false,
      error: 'Erro ao verificar disponibilidade do link'
    };
  }
}

/**
 * Check if slug is available (simple boolean check)
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const result = await validateSlugAvailability(slug);
  return result.available;
}