import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { validateStoredTokens, cleanupOAuthSecurity } from '@/lib/oauth-security';
import { isZeroumAccount } from '@/scripts/create-zeroum-account';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isOAuthUser: boolean;
  isZeroumUser: boolean;
  authProvider: 'email' | 'google' | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ error: Error | null }>;
  validateZeroumAuthentication: () => boolean;
  switchAuthMethod: (targetMethod: 'email' | 'google') => Promise<{ error: Error | null }>;
  getAuthMethodCompatibility: () => { canSwitchToEmail: boolean; canSwitchToGoogle: boolean; reasons: string[] };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOAuthUser, setIsOAuthUser] = useState(false);
  const [isZeroumUser, setIsZeroumUser] = useState(false);
  const [authProvider, setAuthProvider] = useState<'email' | 'google' | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Determine authentication method and user type
        const isOAuth = session?.user?.identities?.some(identity => identity.provider === 'google') ?? false;
        const isZeroum = session?.user?.email ? isZeroumAccount(session.user.email) : false;
        
        setIsOAuthUser(isOAuth);
        setIsZeroumUser(isZeroum);
        
        // Set auth provider based on identities
        if (session?.user) {
          const identities = session.user.identities || [];
          const hasGoogleIdentity = identities.some(identity => identity.provider === 'google');
          const hasEmailIdentity = identities.some(identity => identity.provider === 'email');
          
          if (hasGoogleIdentity && !hasEmailIdentity) {
            setAuthProvider('google');
          } else if (hasEmailIdentity && !hasGoogleIdentity) {
            setAuthProvider('email');
          } else if (hasEmailIdentity && hasGoogleIdentity) {
            // User has both - prioritize the most recent login method
            // For now, default to email for mixed accounts
            setAuthProvider('email');
          } else {
            setAuthProvider(null);
          }
        } else {
          setAuthProvider(null);
        }
        
        // Validate Zeroum account authentication method
        if (isZeroum && isOAuth) {
          console.error('SECURITY VIOLATION: Zeroum account attempted OAuth authentication');
          // Force sign out for security
          await supabase.auth.signOut();
          return;
        }
        
        // Log authentication events for security monitoring
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('Authentication event:', {
            event,
            userId: session.user.id,
            email: session.user.email,
            provider: isOAuth ? 'google' : 'email',
            timestamp: new Date().toISOString(),
          });
          
          // Validate OAuth tokens if this is an OAuth session
          if (isOAuth) {
            const tokenValidation = validateStoredTokens();
            if (!tokenValidation.isValid) {
              console.warn('OAuth token validation failed:', tokenValidation.errors);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Authentication event:', {
            event,
            timestamp: new Date().toISOString(),
          });
          
          // Clean up OAuth security data on sign out
          cleanupOAuthSecurity();
          setIsOAuthUser(false);
          setIsZeroumUser(false);
          setAuthProvider(null);
        } else if (event === 'TOKEN_REFRESHED' && session) {
          console.log('Authentication event:', {
            event,
            userId: session.user?.id,
            timestamp: new Date().toISOString(),
          });
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Determine authentication method and user type
      const isOAuth = session?.user?.identities?.some(identity => identity.provider === 'google') ?? false;
      const isZeroum = session?.user?.email ? isZeroumAccount(session.user.email) : false;
      
      setIsOAuthUser(isOAuth);
      setIsZeroumUser(isZeroum);
      
      // Set auth provider based on identities
      if (session?.user) {
        const identities = session.user.identities || [];
        const hasGoogleIdentity = identities.some(identity => identity.provider === 'google');
        const hasEmailIdentity = identities.some(identity => identity.provider === 'email');
        
        if (hasGoogleIdentity && !hasEmailIdentity) {
          setAuthProvider('google');
        } else if (hasEmailIdentity && !hasGoogleIdentity) {
          setAuthProvider('email');
        } else if (hasEmailIdentity && hasGoogleIdentity) {
          // User has both - prioritize email for consistency
          setAuthProvider('email');
        } else {
          setAuthProvider(null);
        }
      } else {
        setAuthProvider(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Set up automatic token refresh for OAuth users
  useEffect(() => {
    let refreshInterval: NodeJS.Timeout | null = null;

    if (session && isOAuthUser) {
      // Check token expiration and set up refresh interval
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expirationTime = expiresAt * 1000; // Convert to milliseconds
        const currentTime = Date.now();
        const timeUntilExpiry = expirationTime - currentTime;
        
        // Refresh token 5 minutes before expiry, or immediately if already expired
        const refreshTime = Math.max(0, timeUntilExpiry - (5 * 60 * 1000));
        
        refreshInterval = setTimeout(async () => {
          console.log('Attempting automatic token refresh for OAuth user');
          const { error } = await refreshSession();
          
          if (error) {
            console.error('Automatic token refresh failed:', error);
          }
        }, refreshTime);
      }
    }

    return () => {
      if (refreshInterval) {
        clearTimeout(refreshInterval);
      }
    };
  }, [session, isOAuthUser]);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Prevent sign up with Zeroum account email
    if (isZeroumAccount(email)) {
      return { 
        error: new Error('This email is reserved for system use. Please use a different email address.') 
      };
    }
    
    const redirectUrl = `${window.location.origin}/auth`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Validate Zeroum account authentication
    if (isZeroumAccount(email)) {
      console.log('Zeroum account authentication attempt');
      
      // Ensure traditional authentication for Zeroum account
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error) {
        console.log('Zeroum account authenticated successfully via traditional method');
      }
      
      return { error };
    }
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Clean up OAuth security data before signing out
    cleanupOAuthSecurity();
    await supabase.auth.signOut();
  };

  const refreshSession = async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        
        // If refresh fails for OAuth users, clean up security data
        if (isOAuthUser) {
          cleanupOAuthSecurity();
        }
        
        return { error };
      }
      
      // Log successful refresh for security monitoring
      console.log('Session refreshed successfully:', {
        userId: user?.id,
        isOAuth: isOAuthUser,
        timestamp: new Date().toISOString(),
      });
      
      return { error: null };
    } catch (error) {
      console.error('Session refresh error:', error);
      return { error: error as Error };
    }
  };

  const validateZeroumAuthentication = () => {
    if (!user || !session) return false;
    
    // Check if this is the Zeroum account
    if (!isZeroumUser) return true; // Not Zeroum account, validation passes
    
    // For Zeroum account, ensure it's not using OAuth
    if (isOAuthUser) {
      console.error('SECURITY VIOLATION: Zeroum account using OAuth authentication');
      return false;
    }
    
    // Validate email matches expected Zeroum email
    if (user.email !== 'zeroum@barbearia.com') {
      console.error('SECURITY VIOLATION: Zeroum account email mismatch');
      return false;
    }
    
    // Validate authentication method is email/password
    const hasEmailIdentity = user.identities?.some(identity => identity.provider === 'email');
    if (!hasEmailIdentity) {
      console.error('SECURITY VIOLATION: Zeroum account not using email authentication');
      return false;
    }
    
    return true;
  };

  const switchAuthMethod = async (targetMethod: 'email' | 'google'): Promise<{ error: Error | null }> => {
    if (!user || !session) {
      return { error: new Error('No active session to switch authentication method') };
    }

    // Prevent switching for Zeroum account
    if (isZeroumUser) {
      return { error: new Error('Authentication method switching is not allowed for system accounts') };
    }

    // Check current method
    if (authProvider === targetMethod) {
      return { error: new Error(`Already using ${targetMethod} authentication`) };
    }

    try {
      if (targetMethod === 'google') {
        // Switching to Google OAuth - this would require linking Google identity
        // For now, we'll return an error as this requires user interaction
        return { error: new Error('Switching to Google authentication requires re-authentication. Please sign out and sign in with Google.') };
      } else if (targetMethod === 'email') {
        // Switching to email/password - this would require setting a password
        // For now, we'll return an error as this requires user interaction
        return { error: new Error('Switching to email authentication requires setting a password. Please use account settings.') };
      }

      return { error: new Error('Unsupported authentication method') };
    } catch (error) {
      console.error('Error switching authentication method:', error);
      return { error: error as Error };
    }
  };

  const getAuthMethodCompatibility = (): { canSwitchToEmail: boolean; canSwitchToGoogle: boolean; reasons: string[] } => {
    const reasons: string[] = [];
    let canSwitchToEmail = false;
    let canSwitchToGoogle = false;

    if (!user || !session) {
      reasons.push('No active session');
      return { canSwitchToEmail, canSwitchToGoogle, reasons };
    }

    // Zeroum account cannot switch methods
    if (isZeroumUser) {
      reasons.push('System accounts cannot switch authentication methods');
      return { canSwitchToEmail, canSwitchToGoogle, reasons };
    }

    const identities = user.identities || [];
    const hasGoogleIdentity = identities.some(identity => identity.provider === 'google');
    const hasEmailIdentity = identities.some(identity => identity.provider === 'email');

    // Check if can switch to Google
    if (!hasGoogleIdentity) {
      canSwitchToGoogle = true;
    } else {
      reasons.push('Google authentication already linked');
    }

    // Check if can switch to email
    if (!hasEmailIdentity) {
      canSwitchToEmail = true;
    } else {
      reasons.push('Email authentication already available');
    }

    // Additional constraints
    if (authProvider === 'google' && !hasEmailIdentity) {
      reasons.push('Email authentication requires password setup');
    }

    if (authProvider === 'email' && !hasGoogleIdentity) {
      reasons.push('Google authentication requires account linking');
    }

    return { canSwitchToEmail, canSwitchToGoogle, reasons };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isOAuthUser, 
      isZeroumUser, 
      authProvider,
      signUp, 
      signIn, 
      signOut, 
      refreshSession,
      validateZeroumAuthentication,
      switchAuthMethod,
      getAuthMethodCompatibility
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
