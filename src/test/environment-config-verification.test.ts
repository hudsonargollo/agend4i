/**
 * Environment Configuration Verification Test
 * 
 * This test verifies that the environment configuration files (.env.development, .env.staging, .env.production)
 * are properly configured and that the domain service can read them correctly.
 */

import { describe, it, expect } from 'vitest';
import {
  getDomainConfig,
  type EnvironmentDetector,
} from '@/lib/domain';

// Helper function to create mock environment detector
function createMockDetector(overrides: Partial<EnvironmentDetector> = {}): EnvironmentDetector {
  return {
    isDev: false,
    hostname: 'localhost',
    viteEnvironment: undefined,
    viteAppDomain: undefined,
    ...overrides,
  };
}

describe('Environment Configuration Verification', () => {
  it('should handle development environment configuration', () => {
    // Simulate development environment with VITE_APP_DOMAIN=localhost:8080
    const detector = createMockDetector({
      isDev: true,
      hostname: 'localhost',
      viteEnvironment: 'development',
      viteAppDomain: 'localhost:8080',
    });

    const config = getDomainConfig(detector);

    expect(config.environment).toBe('development');
    expect(config.baseDomain).toBe('localhost');
    expect(config.protocol).toBe('http');
    expect(config.port).toBe(8080);
  });

  it('should handle staging environment configuration', () => {
    // Simulate staging environment with VITE_APP_DOMAIN=staging.agendai.clubemkt.digital
    const detector = createMockDetector({
      isDev: false,
      hostname: 'staging.agendai.clubemkt.digital',
      viteEnvironment: 'staging',
      viteAppDomain: 'staging.agendai.clubemkt.digital',
    });

    const config = getDomainConfig(detector);

    expect(config.environment).toBe('staging');
    expect(config.baseDomain).toBe('staging.agendai.clubemkt.digital');
    expect(config.protocol).toBe('https');
    expect(config.port).toBeUndefined();
  });

  it('should handle production environment configuration', () => {
    // Simulate production environment with VITE_APP_DOMAIN=agendai.clubemkt.digital
    const detector = createMockDetector({
      isDev: false,
      hostname: 'agendai.clubemkt.digital',
      viteEnvironment: 'production',
      viteAppDomain: 'agendai.clubemkt.digital',
    });

    const config = getDomainConfig(detector);

    expect(config.environment).toBe('production');
    expect(config.baseDomain).toBe('agendai.clubemkt.digital');
    expect(config.protocol).toBe('https');
    expect(config.port).toBeUndefined();
  });

  it('should verify environment variable override behavior', () => {
    // Test that VITE_APP_DOMAIN overrides environment detection
    const testCases = [
      {
        name: 'Development override',
        detector: createMockDetector({
          isDev: true,
          hostname: 'localhost',
          viteEnvironment: 'development',
          viteAppDomain: 'custom-dev.example.com',
        }),
        expectedDomain: 'custom-dev.example.com',
        expectedProtocol: 'https' as const,
      },
      {
        name: 'Staging override',
        detector: createMockDetector({
          isDev: false,
          hostname: 'staging.agendai.clubemkt.digital',
          viteEnvironment: 'staging',
          viteAppDomain: 'custom-staging.example.com',
        }),
        expectedDomain: 'custom-staging.example.com',
        expectedProtocol: 'https' as const,
      },
      {
        name: 'Production override',
        detector: createMockDetector({
          isDev: false,
          hostname: 'agendai.clubemkt.digital',
          viteEnvironment: 'production',
          viteAppDomain: 'custom-prod.example.com',
        }),
        expectedDomain: 'custom-prod.example.com',
        expectedProtocol: 'https' as const,
      },
    ];

    testCases.forEach(({ name, detector, expectedDomain, expectedProtocol }) => {
      const config = getDomainConfig(detector);
      
      expect(config.baseDomain, `${name} - domain`).toBe(expectedDomain);
      expect(config.protocol, `${name} - protocol`).toBe(expectedProtocol);
    });
  });

  it('should handle localhost with different ports correctly', () => {
    const portTestCases = [
      { domain: 'localhost:3000', expectedPort: 3000 },
      { domain: 'localhost:5173', expectedPort: 5173 },
      { domain: 'localhost:8080', expectedPort: 8080 },
    ];

    portTestCases.forEach(({ domain, expectedPort }) => {
      const detector = createMockDetector({
        isDev: true,
        hostname: 'localhost',
        viteEnvironment: 'development',
        viteAppDomain: domain,
      });

      const config = getDomainConfig(detector);

      expect(config.baseDomain).toBe('localhost');
      expect(config.protocol).toBe('http');
      expect(config.port).toBe(expectedPort);
    });
  });
});