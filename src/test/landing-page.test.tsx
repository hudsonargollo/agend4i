/**
 * Unit tests for landing page component
 * Tests marketing content display, CTA functionality, routing behavior, and public accessibility
 * Requirements: 9.1, 9.2, 9.3, 9.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '@/pages/Index';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Wrapper component for router context
const RouterWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Landing Page Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Marketing Content Display', () => {
    it('displays the main hero section with value proposition', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for main value proposition - Requirement 9.1, 9.4
      expect(screen.getByText('Sua agenda profissional')).toBeInTheDocument();
      expect(screen.getByText('online')).toBeInTheDocument();
      expect(screen.getByText(/Transforme seu negócio com uma plataforma completa de agendamentos/)).toBeInTheDocument();
    });

    it('displays the agend4i brand logo and name', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for brand elements - Requirement 9.4
      const brandElements = screen.getAllByText('agend4i');
      expect(brandElements.length).toBeGreaterThan(0);
    });

    it('displays trust indicators correctly', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for trust indicators - Requirement 9.4
      expect(screen.getByText('Grátis para começar')).toBeInTheDocument();
      expect(screen.getByText('Sem cartão de crédito')).toBeInTheDocument();
      expect(screen.getByText('Configuração em 2 minutos')).toBeInTheDocument();
    });

    it('displays features overview section', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for features section - Requirement 9.4
      expect(screen.getByText('Tudo que você precisa para crescer')).toBeInTheDocument();
      expect(screen.getByText('Agendamento Online')).toBeInTheDocument();
      expect(screen.getByText('Notificações WhatsApp')).toBeInTheDocument();
      expect(screen.getByText('Gestão de Equipe')).toBeInTheDocument();
      expect(screen.getByText('Pagamentos Online')).toBeInTheDocument();
    });

    it('displays benefits section with customer testimonial', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for benefits section - Requirement 9.4
      expect(screen.getByText('Mais tempo para o que importa')).toBeInTheDocument();
      expect(screen.getByText('Reduz no-shows')).toBeInTheDocument();
      expect(screen.getByText('Aumenta faturamento')).toBeInTheDocument();
      expect(screen.getByText('Melhora experiência')).toBeInTheDocument();
      
      // Check for testimonial
      expect(screen.getByText(/Desde que comecei a usar o agend4i/)).toBeInTheDocument();
      expect(screen.getByText('Barbearia do João')).toBeInTheDocument();
    });

    it('displays final CTA section', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for final CTA section - Requirement 9.4
      expect(screen.getByText('Pronto para transformar seu negócio?')).toBeInTheDocument();
      expect(screen.getByText(/Junte-se a centenas de profissionais/)).toBeInTheDocument();
    });

    it('displays footer with brand and links', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for footer - Requirement 9.4
      expect(screen.getByText('A plataforma que conecta profissionais aos seus clientes')).toBeInTheDocument();
      expect(screen.getByText('Termos de Uso')).toBeInTheDocument();
      expect(screen.getByText('Privacidade')).toBeInTheDocument();
      expect(screen.getByText('Suporte')).toBeInTheDocument();
    });
  });

  describe('Call-to-Action Functionality', () => {
    it('displays "Criar conta grátis" CTA buttons correctly', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for signup CTAs - Requirement 9.2
      const signupButtons = screen.getAllByText(/Criar conta grátis/);
      expect(signupButtons.length).toBeGreaterThan(0);
      
      // Check the main hero CTA
      const heroSignupButton = signupButtons[0];
      expect(heroSignupButton).toBeInTheDocument();
      expect(heroSignupButton.closest('a')).toHaveAttribute('href', '/auth?mode=signup');
    });

    it('displays "Entrar" CTA buttons correctly', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for login CTAs - Requirement 9.3
      const loginButtons = screen.getAllByText('Entrar');
      expect(loginButtons.length).toBeGreaterThan(0);
      
      // Check header login link
      const headerLoginButton = loginButtons[0];
      expect(headerLoginButton).toBeInTheDocument();
      expect(headerLoginButton.closest('a')).toHaveAttribute('href', '/auth');
      
      // Check hero section login button
      const heroLoginButton = loginButtons[1];
      expect(heroLoginButton).toBeInTheDocument();
      expect(heroLoginButton.closest('a')).toHaveAttribute('href', '/auth?mode=login');
    });

    it('displays final CTA button with correct link', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for final CTA - Requirement 9.2
      const finalCTA = screen.getByText('Começar agora - É grátis');
      expect(finalCTA).toBeInTheDocument();
      expect(finalCTA.closest('a')).toHaveAttribute('href', '/auth?mode=signup');
    });

    it('has proper link attributes for external links', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check external links have proper attributes
      const footerLinks = screen.getAllByRole('link');
      const externalLinks = footerLinks.filter(link => 
        link.getAttribute('href')?.startsWith('#')
      );
      
      // Footer links should be present (even if they're placeholder links)
      expect(externalLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Routing Behavior', () => {
    it('renders without requiring authentication', () => {
      // This test verifies that the component renders without auth context - Requirement 9.5
      expect(() => {
        render(
          <RouterWrapper>
            <Index />
          </RouterWrapper>
        );
      }).not.toThrow();
      
      // Verify main content is visible
      expect(screen.getByText('Sua agenda profissional')).toBeInTheDocument();
    });

    it('has correct routing links for signup flow', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check signup routing - Requirement 9.2
      const signupLinks = screen.getAllByRole('link').filter(link => 
        link.getAttribute('href')?.includes('mode=signup')
      );
      expect(signupLinks.length).toBeGreaterThan(0);
      
      signupLinks.forEach(link => {
        expect(link.getAttribute('href')).toBe('/auth?mode=signup');
      });
    });

    it('has correct routing links for login flow', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check login routing - Requirement 9.3
      const loginLinks = screen.getAllByRole('link').filter(link => {
        const href = link.getAttribute('href');
        return href === '/auth' || href === '/auth?mode=login';
      });
      expect(loginLinks.length).toBeGreaterThan(0);
    });

    it('has proper internal navigation links', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check that there are internal navigation links (the brand logo in header and footer)
      const allLinks = screen.getAllByRole('link');
      expect(allLinks.length).toBeGreaterThan(0);
      
      // Verify that some links are internal (not external)
      const internalLinks = allLinks.filter(link => {
        const href = link.getAttribute('href');
        return href && (href.startsWith('/') || href.startsWith('#'));
      });
      expect(internalLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Public Accessibility', () => {
    it('renders all content without authentication context', () => {
      // Test that component works without auth providers - Requirement 9.5
      const { container } = render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Verify the component rendered successfully
      expect(container.firstChild).toBeInTheDocument();
      
      // Verify key sections are present
      expect(screen.getByText('Sua agenda profissional')).toBeInTheDocument();
      expect(screen.getByText('Tudo que você precisa para crescer')).toBeInTheDocument();
      expect(screen.getByText('Mais tempo para o que importa')).toBeInTheDocument();
    });

    it('does not require user session or tenant context', () => {
      // Verify no auth-related errors are thrown - Requirement 9.5
      expect(() => {
        render(
          <RouterWrapper>
            <Index />
          </RouterWrapper>
        );
      }).not.toThrow();
    });

    it('has accessible navigation structure', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for proper semantic structure - Requirement 9.5
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
      
      // Check for navigation links
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });

    it('displays responsive design elements', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Verify responsive classes are applied - Requirement 9.4
      const heroSection = screen.getByText('Sua agenda profissional').closest('section');
      expect(heroSection).toHaveClass('container', 'mx-auto');
      
      // Check for responsive text sizing
      const mainHeading = screen.getByText('Sua agenda profissional');
      expect(mainHeading).toHaveClass('text-5xl', 'md:text-6xl');
    });
  });

  describe('Content Structure and SEO', () => {
    it('has proper heading hierarchy', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check for proper heading structure
      const h1Elements = screen.getAllByRole('heading', { level: 1 });
      expect(h1Elements.length).toBe(1);
      // The h1 contains "Sua agenda profissional" and "online" as separate elements
      expect(h1Elements[0]).toHaveTextContent(/Sua agenda profissional/);
      expect(h1Elements[0]).toHaveTextContent(/online/);
      
      const h2Elements = screen.getAllByRole('heading', { level: 2 });
      expect(h2Elements.length).toBeGreaterThan(0);
    });

    it('includes key marketing messages', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Verify key value propositions are present - Requirement 9.1, 9.4
      expect(screen.getByText(/plataforma completa de agendamentos/)).toBeInTheDocument();
      expect(screen.getByText(/Seus clientes agendam online/)).toBeInTheDocument();
      expect(screen.getByText(/você gerencia tudo em um só lugar/)).toBeInTheDocument();
    });

    it('has clear feature descriptions', () => {
      render(
        <RouterWrapper>
          <Index />
        </RouterWrapper>
      );

      // Check feature descriptions - Requirement 9.4
      expect(screen.getByText(/Seus clientes agendam 24\/7/)).toBeInTheDocument();
      expect(screen.getByText(/Confirmações automáticas por WhatsApp/)).toBeInTheDocument();
      expect(screen.getByText(/Controle agendas de múltiplos profissionais/)).toBeInTheDocument();
      expect(screen.getByText(/Receba pagamentos antecipados/)).toBeInTheDocument();
    });
  });
});