import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  },
}));

import { 
  createZeroumAccount, 
  validateZeroumAccount, 
  isZeroumAccount, 
  ZEROUM_ACCOUNT 
} from '@/scripts/create-zeroum-account';

describe('Zeroum Account Functionality', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import('@/integrations/supabase/client');
    mockSupabase = supabase;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ZEROUM_ACCOUNT constants', () => {
    it('should have correct Zeroum account constants', () => {
      expect(ZEROUM_ACCOUNT.email).toBe('zeroum@barbearia.com');
      expect(ZEROUM_ACCOUNT.password).toBe('rods1773#');
      expect(ZEROUM_ACCOUNT.fullName).toBe('Zeroum Barbearia Admin');
      expect(ZEROUM_ACCOUNT.tenantSlug).toBe('zeroumbarbearia');
      expect(ZEROUM_ACCOUNT.tenantName).toBe('Zeroum Barbearia');
      expect(ZEROUM_ACCOUNT.plan).toBe('pro');
      expect(ZEROUM_ACCOUNT.role).toBe('owner');
    });

    it('should have immutable constants', () => {
      // Verify constants are readonly
      expect(() => {
        // @ts-expect-error - Testing immutability
        ZEROUM_ACCOUNT.email = 'different@email.com';
      }).toThrow();
    });
  });

  describe('isZeroumAccount function', () => {
    it('should correctly identify Zeroum account email', () => {
      expect(isZeroumAccount('zeroum@barbearia.com')).toBe(true);
      expect(isZeroumAccount('ZEROUM@BARBEARIA.COM')).toBe(false); // Case sensitive
      expect(isZeroumAccount('other@email.com')).toBe(false);
      expect(isZeroumAccount('')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isZeroumAccount('zeroum@barbearia.com ')).toBe(false); // Trailing space
      expect(isZeroumAccount(' zeroum@barbearia.com')).toBe(false); // Leading space
      expect(isZeroumAccount('zeroum+test@barbearia.com')).toBe(false); // Similar but different
    });
  });

  describe('createZeroumAccount function', () => {
    it('should return existing tenant if already exists', async () => {
      const existingTenant = {
        id: 'existing-tenant-id',
        slug: 'zeroumbarbearia',
        name: 'Zeroum Barbearia',
        plan: 'pro',
        status: 'active',
        settings: {
          whatsapp_enabled: true,
          payment_enabled: true,
          is_zeroum_account: true,
          account_protected: true,
        },
      };

      // Mock existing tenant found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: existingTenant,
        error: null,
      });

      const result = await createZeroumAccount();

      expect(result.success).toBe(true);
      expect(result.tenant).toEqual(existingTenant);
      expect(result.isExisting).toBe(true);
    });

    it('should create new account when none exists', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'zeroum@barbearia.com',
      };

      const newTenant = {
        id: 'new-tenant-id',
        slug: 'zeroumbarbearia',
        name: 'Zeroum Barbearia',
        owner_id: 'new-user-id',
        plan: 'pro',
        status: 'active',
      };

      // Mock no existing tenant
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error
      });

      // Mock sign in failure (account doesn't exist)
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      // Mock successful account creation
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser },
        error: null,
      });

      // Mock tenant creation
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newTenant,
        error: null,
      });

      // Mock membership creation
      mockSupabase.from().insert.mockResolvedValue({
        error: null,
      });

      const result = await createZeroumAccount();

      expect(result.success).toBe(true);
      expect(result.user).toEqual(newUser);
      expect(result.tenant).toEqual(newTenant);
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: ZEROUM_ACCOUNT.email,
        password: ZEROUM_ACCOUNT.password,
        options: {
          data: {
            full_name: ZEROUM_ACCOUNT.fullName,
            is_zeroum_account: true,
            oauth_linking_disabled: true,
          },
        },
      });
    });

    it('should handle account creation errors', async () => {
      // Mock no existing tenant
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock sign in failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      // Mock account creation failure
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already registered' },
      });

      const result = await createZeroumAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Email already registered');
    });

    it('should handle tenant creation errors', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'zeroum@barbearia.com',
      };

      // Mock no existing tenant
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock sign in failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      // Mock successful account creation
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser },
        error: null,
      });

      // Mock tenant creation failure
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Tenant creation failed' },
      });

      const result = await createZeroumAccount();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Tenant creation failed');
    });

    it('should create tenant with proper protection flags', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'zeroum@barbearia.com',
      };

      // Mock no existing tenant
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock sign in failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      // Mock successful account creation
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser },
        error: null,
      });

      // Mock tenant creation
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-tenant-id' },
            error: null,
          }),
        })),
      }));
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      });

      // Mock membership creation
      mockSupabase.from().insert.mockResolvedValue({
        error: null,
      });

      await createZeroumAccount();

      expect(mockInsert).toHaveBeenCalledWith({
        name: ZEROUM_ACCOUNT.tenantName,
        slug: ZEROUM_ACCOUNT.tenantSlug,
        owner_id: newUser.id,
        plan: ZEROUM_ACCOUNT.plan,
        status: 'active',
        settings: {
          whatsapp_enabled: true,
          payment_enabled: true,
          is_zeroum_account: true,
          account_protected: true,
          business_hours: {
            monday: { open: '09:00', close: '18:00' },
            tuesday: { open: '09:00', close: '18:00' },
            wednesday: { open: '09:00', close: '18:00' },
            thursday: { open: '09:00', close: '18:00' },
            friday: { open: '09:00', close: '18:00' },
            saturday: { open: '09:00', close: '16:00' },
            sunday: { closed: true },
          },
        },
      });
    });
  });

  describe('validateZeroumAccount function', () => {
    it('should validate existing Zeroum account successfully', async () => {
      const mockUser = {
        id: 'zeroum-user-id',
        email: 'zeroum@barbearia.com',
      };

      const mockTenant = {
        id: 'zeroum-tenant-id',
        slug: 'zeroumbarbearia',
        name: 'Zeroum Barbearia',
        plan: 'pro',
        status: 'active',
        settings: {
          whatsapp_enabled: true,
          payment_enabled: true,
          is_zeroum_account: true,
          account_protected: true,
          business_hours: {},
        },
      };

      // Mock successful sign in
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock tenant lookup
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockTenant,
        error: null,
      });

      // Mock sign out
      mockSupabase.auth.signOut.mockResolvedValue({});

      const result = await validateZeroumAccount();

      expect(result.isValid).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.tenant).toEqual(mockTenant);
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: ZEROUM_ACCOUNT.email,
        password: ZEROUM_ACCOUNT.password,
      });
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should fail validation when account does not exist', async () => {
      // Mock sign in failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await validateZeroumAccount();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Zeroum account does not exist or credentials are incorrect');
    });

    it('should fail validation when tenant does not exist', async () => {
      const mockUser = {
        id: 'zeroum-user-id',
        email: 'zeroum@barbearia.com',
      };

      // Mock successful sign in
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock tenant not found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Tenant not found' },
      });

      // Mock sign out
      mockSupabase.auth.signOut.mockResolvedValue({});

      const result = await validateZeroumAccount();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Zeroum tenant does not exist');
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should fail validation when tenant configuration is invalid', async () => {
      const mockUser = {
        id: 'zeroum-user-id',
        email: 'zeroum@barbearia.com',
      };

      const invalidTenant = {
        id: 'zeroum-tenant-id',
        slug: 'zeroumbarbearia',
        name: 'Wrong Name', // Invalid name
        plan: 'free', // Invalid plan
        status: 'inactive', // Invalid status
        settings: {
          whatsapp_enabled: false, // Invalid setting
        },
      };

      // Mock successful sign in
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock tenant lookup
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: invalidTenant,
        error: null,
      });

      // Mock sign out
      mockSupabase.auth.signOut.mockResolvedValue({});

      const result = await validateZeroumAccount();

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Incorrect tenant name: Wrong Name');
      expect(result.issues).toContain('Incorrect plan: free');
      expect(result.issues).toContain('Incorrect status: inactive');
      expect(result.issues).toContain('WhatsApp not enabled');
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      // Mock sign in throwing an error
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await validateZeroumAccount();

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('Account protection mechanisms', () => {
    it('should prevent OAuth linking through metadata flags', async () => {
      // This test verifies that the account creation includes protection flags
      const newUser = {
        id: 'new-user-id',
        email: 'zeroum@barbearia.com',
      };

      // Mock no existing tenant
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock sign in failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      // Mock successful account creation
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser },
        error: null,
      });

      // Mock tenant creation
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: { id: 'new-tenant-id' },
        error: null,
      });

      // Mock membership creation
      mockSupabase.from().insert.mockResolvedValue({
        error: null,
      });

      await createZeroumAccount();

      // Verify account was created with protection flags
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: ZEROUM_ACCOUNT.email,
        password: ZEROUM_ACCOUNT.password,
        options: {
          data: {
            full_name: ZEROUM_ACCOUNT.fullName,
            is_zeroum_account: true,
            oauth_linking_disabled: true,
          },
        },
      });
    });

    it('should ensure tenant has protection settings', async () => {
      const existingTenant = {
        id: 'existing-tenant-id',
        slug: 'zeroumbarbearia',
        name: 'Zeroum Barbearia',
        plan: 'pro',
        status: 'active',
        settings: {
          whatsapp_enabled: true,
          payment_enabled: true,
          is_zeroum_account: true,
          account_protected: true,
          business_hours: {},
        },
      };

      // Mock existing tenant found
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: existingTenant,
        error: null,
      });

      const result = await createZeroumAccount();

      expect(result.success).toBe(true);
      expect(result.tenant.settings.is_zeroum_account).toBe(true);
      expect(result.tenant.settings.account_protected).toBe(true);
    });
  });

  describe('Sample data creation', () => {
    it('should create default services for Zeroum account', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'zeroum@barbearia.com',
      };

      const newTenant = {
        id: 'new-tenant-id',
        slug: 'zeroumbarbearia',
      };

      // Mock no existing tenant
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock sign in failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      // Mock successful account creation
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser },
        error: null,
      });

      // Mock tenant creation
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newTenant,
        error: null,
      });

      // Mock membership creation
      mockSupabase.from().insert.mockResolvedValue({
        error: null,
      });

      const result = await createZeroumAccount();

      expect(result.success).toBe(true);
      
      // Verify services were created (called multiple times for different services)
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: newTenant.id,
          name: 'Corte Masculino',
          price: 25.00,
          duration: 30,
        })
      );
    });

    it('should create default staff member for Zeroum account', async () => {
      const newUser = {
        id: 'new-user-id',
        email: 'zeroum@barbearia.com',
      };

      const newTenant = {
        id: 'new-tenant-id',
        slug: 'zeroumbarbearia',
      };

      // Mock no existing tenant
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Mock sign in failure
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      // Mock successful account creation
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: newUser },
        error: null,
      });

      // Mock tenant creation
      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: newTenant,
        error: null,
      });

      // Mock membership and services creation
      mockSupabase.from().insert.mockResolvedValue({
        error: null,
      });

      const result = await createZeroumAccount();

      expect(result.success).toBe(true);
      
      // Verify staff was created
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: newTenant.id,
          display_name: 'Barbeiro Principal',
          is_active: true,
        })
      );
    });
  });
});