import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Onboarding from '@/pages/Onboarding';
import { generateSlugFromName, isValidSlugFormat, isReservedSlug } from '@/lib/slugValidation';
import { validateSlugAvailability } from '@/lib/slugValidationService';

// Create mock functions that can be controlled in tests
const mockCreateTenant = vi.fn();
const mockToast = vi.fn();

// Mock the hooks and services
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false
  })
}));

vi.mock('@/hooks/useTenant', () => ({
  useTenant: () => ({
    userTenants: [],
    createTenant: mockCreateTenant,
    loading: false
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

vi.mock('@/lib/domain', () => ({
  getCurrentDomain: () => 'test.example.com',
  generateTenantURL: (slug: string) => `https://test.example.com/${slug}`
}));

vi.mock('@/lib/slugValidationService');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('Onboarding Flow Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockCreateTenant.mockResolvedValue({ error: null });
    mockToast.mockImplementation(() => {});
  });

  describe('Shop Name Input and Slug Generation', () => {
    /**
     * Tests Requirements: 10.2, 10.4
     */
    it('should generate slug automatically from shop name input', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Onboarding />);

      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      
      await user.type(shopNameInput, 'Barbearia do João');
      
      // Should show preview of generated slug
      expect(screen.getByText(/test\.example\.com\/barbearia-do-joao/i)).toBeInTheDocument();
    });

    it('should handle special characters in shop name', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Onboarding />);

      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      
      await user.type(shopNameInput, 'Café & Beleza');
      
      // Should normalize special characters
      expect(screen.getByText(/test\.example\.com\/cafe-beleza/i)).toBeInTheDocument();
    });

    it('should require minimum shop name length', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Onboarding />);

      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      const continueButton = screen.getByRole('button', { name: /continuar/i });
      
      await user.type(shopNameInput, 'A');
      
      expect(continueButton).toBeDisabled();
    });

    it('should enable continue button with valid shop name', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Onboarding />);

      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      const continueButton = screen.getByRole('button', { name: /continuar/i });
      
      await user.type(shopNameInput, 'Valid Shop Name');
      
      expect(continueButton).toBeEnabled();
    });
  });

  describe('Slug Validation and Availability Checking', () => {
    /**
     * Tests Requirements: 10.3, 11.1, 11.3
     */
    it('should validate slug availability in real-time', async () => {
      const user = userEvent.setup();
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({ available: true });

      renderWithRouter(<Onboarding />);

      // Go to step 2
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Should show slug validation
      await waitFor(() => {
        expect(mockValidateSlug).toHaveBeenCalledWith('test-shop');
      });
    });

    it('should show error for reserved slugs', async () => {
      const user = userEvent.setup();
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({
        available: false,
        error: 'Este nome está reservado pelo sistema',
        suggestions: ['app-shop', 'app1', 'app-store']
      });

      renderWithRouter(<Onboarding />);

      // Go to step 2
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Manually edit slug to reserved word
      const slugInput = screen.getByDisplayValue('test-shop');
      await user.clear(slugInput);
      await user.type(slugInput, 'app');

      await waitFor(() => {
        expect(screen.getByText(/este nome está reservado pelo sistema/i)).toBeInTheDocument();
      });
    });

    it('should show suggestions when slug is unavailable', async () => {
      const user = userEvent.setup();
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({
        available: false,
        error: 'Este link já está em uso',
        suggestions: ['test-shop1', 'test-shop2', 'test-shop-new']
      });

      renderWithRouter(<Onboarding />);

      // Go to step 2
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      await waitFor(() => {
        expect(screen.getByText(/experimente uma dessas alternativas/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /test-shop1/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /test-shop2/ })).toBeInTheDocument();
      });
    });

    it('should allow manual slug editing', async () => {
      const user = userEvent.setup();
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({ available: true });

      renderWithRouter(<Onboarding />);

      // Go to step 2
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Edit slug manually
      const slugInput = screen.getByDisplayValue('test-shop');
      await user.clear(slugInput);
      await user.type(slugInput, 'custom-slug');

      await waitFor(() => {
        expect(mockValidateSlug).toHaveBeenCalledWith('custom-slug');
      });
    });

    it('should clean invalid characters from slug input', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Onboarding />);

      // Go to step 2
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Try to type invalid characters
      const slugInput = screen.getByDisplayValue('test-shop');
      await user.clear(slugInput);
      await user.type(slugInput, 'Test@Shop!');

      // Should clean to valid characters only
      expect(slugInput).toHaveValue('testshop');
    });
  });

  describe('Tenant Creation and User Association', () => {
    /**
     * Tests Requirements: 10.2, 10.3, 10.4
     */
    it('should create tenant with valid data', async () => {
      const user = userEvent.setup();
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({ available: true });

      renderWithRouter(<Onboarding />);

      // Fill form
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Wait for slug validation
      await waitFor(() => {
        expect(screen.getByText(/✓ link disponível/i)).toBeInTheDocument();
      });

      // Submit form
      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      await user.click(createButton);

      expect(mockCreateTenant).toHaveBeenCalledWith('Test Shop', 'test-shop');
    });

    it('should handle tenant creation errors', async () => {
      const user = userEvent.setup();
      mockCreateTenant.mockResolvedValue({ 
        error: { message: 'Database error' } 
      });
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({ available: true });

      renderWithRouter(<Onboarding />);

      // Fill and submit form
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      await waitFor(() => {
        expect(screen.getByText(/✓ link disponível/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Erro ao criar estabelecimento',
          description: 'Database error',
          variant: 'destructive'
        });
      });
    });

    it('should redirect to admin dashboard after successful creation', async () => {
      const user = userEvent.setup();
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({ available: true });

      renderWithRouter(<Onboarding />);

      // Fill and submit form
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      await waitFor(() => {
        expect(screen.getByText(/✓ link disponível/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app');
      });
    });

    it('should disable create button when slug is not available', async () => {
      const user = userEvent.setup();
      const mockValidateSlug = vi.mocked(validateSlugAvailability);
      mockValidateSlug.mockResolvedValue({
        available: false,
        error: 'Este link já está em uso'
      });

      renderWithRouter(<Onboarding />);

      // Fill form
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /criar estabelecimento/i });
        expect(createButton).toBeDisabled();
      });
    });
  });

  describe('Progress Indicators and User Guidance', () => {
    it('should show progress indicator', () => {
      renderWithRouter(<Onboarding />);
      
      expect(screen.getByText(/passo 1 de 2/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show helpful guidance messages', () => {
      renderWithRouter(<Onboarding />);
      
      expect(screen.getByText(/digite o nome do seu estabelecimento/i)).toBeInTheDocument();
    });

    it('should update progress when moving to step 2', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Onboarding />);

      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      expect(screen.getByText(/passo 2 de 2/i)).toBeInTheDocument();
      expect(screen.getByText(/personalize seu link de agendamentos/i)).toBeInTheDocument();
    });

    it('should allow going back to step 1', async () => {
      const user = userEvent.setup();
      renderWithRouter(<Onboarding />);

      // Go to step 2
      const shopNameInput = screen.getByLabelText(/nome do estabelecimento/i);
      await user.type(shopNameInput, 'Test Shop');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Go back
      await user.click(screen.getByRole('button', { name: /voltar/i }));

      expect(screen.getByText(/passo 1 de 2/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Shop')).toBeInTheDocument();
    });
  });
});

describe('Slug Validation Functions Unit Tests', () => {
  describe('generateSlugFromName', () => {
    it('should generate valid slugs from shop names', () => {
      expect(generateSlugFromName('Barbearia do João')).toBe('barbearia-do-joao');
      expect(generateSlugFromName('Café & Beleza')).toBe('cafe-beleza');
      expect(generateSlugFromName('Hair Studio 123')).toBe('hair-studio-123');
    });

    it('should handle edge cases', () => {
      expect(generateSlugFromName('!!!')).toBe('loja');
      expect(generateSlugFromName('   ')).toBe('loja');
      expect(generateSlugFromName('A')).toBe('loja');
    });

    it('should limit length', () => {
      const longName = 'A'.repeat(100);
      const slug = generateSlugFromName(longName);
      expect(slug.length).toBeLessThanOrEqual(50);
    });
  });

  describe('isValidSlugFormat', () => {
    it('should validate correct slug formats', () => {
      expect(isValidSlugFormat('valid-slug')).toBe(true);
      expect(isValidSlugFormat('test123')).toBe(true);
      expect(isValidSlugFormat('my-shop-2024')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidSlugFormat('a')).toBe(false); // too short
      expect(isValidSlugFormat('Test')).toBe(false); // uppercase
      expect(isValidSlugFormat('test@shop')).toBe(false); // special chars
      expect(isValidSlugFormat('-test')).toBe(false); // leading hyphen
      expect(isValidSlugFormat('test-')).toBe(false); // trailing hyphen
    });
  });

  describe('isReservedSlug', () => {
    it('should identify reserved slugs', () => {
      expect(isReservedSlug('app')).toBe(true);
      expect(isReservedSlug('auth')).toBe(true);
      expect(isReservedSlug('dashboard')).toBe(true);
      expect(isReservedSlug('admin')).toBe(true);
    });

    it('should allow non-reserved slugs', () => {
      expect(isReservedSlug('my-shop')).toBe(false);
      expect(isReservedSlug('barbearia')).toBe(false);
      expect(isReservedSlug('salon')).toBe(false);
    });
  });
});