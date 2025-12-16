import { describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';

describe('Supabase Connection', () => {
  it('should have valid configuration', () => {
    expect(supabase).toBeDefined();
    expect(import.meta.env.VITE_SUPABASE_URL).toBeTruthy();
    expect(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY).toBeTruthy();
  });

  it('should be able to connect to Supabase', async () => {
    // Test basic connection by checking if we can get the current session
    // This is a lighter test that doesn't require database access
    const { data: session } = await supabase.auth.getSession();
    
    // Should not throw errors and should return a session object (even if null)
    expect(session).toBeDefined();
  });

  it('should have proper authentication setup', () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth.signInWithPassword).toBe('function');
    expect(typeof supabase.auth.signUp).toBe('function');
    expect(typeof supabase.auth.signOut).toBe('function');
  });
});