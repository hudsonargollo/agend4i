/**
 * GitHub Actions Security Configuration
 * 
 * This module defines security policies and validation rules for GitHub Actions
 * deployment workflows, ensuring secure handling of secrets and environment variables.
 */

export interface SecurityPolicy {
  name: string;
  description: string;
  required: boolean;
  environments: string[];
  validation?: (value: string) => boolean;
  errorMessage?: string;
}

export interface EnvironmentSecurityConfig {
  environment: string;
  requiredSecrets: string[];
  optionalSecrets: string[];
  securityPolicies: SecurityPolicy[];
  fallbackSecrets: Record<string, string>;
}

/**
 * Security policies for GitHub Actions secrets
 */
export const SECURITY_POLICIES: SecurityPolicy[] = [
  {
    name: 'CLOUDFLARE_API_TOKEN_FORMAT',
    description: 'Cloudflare API token must be properly formatted',
    required: true,
    environments: ['production', 'staging', 'preview'],
    validation: (value: string) => /^[a-zA-Z0-9_-]{40,}$/.test(value),
    errorMessage: 'Cloudflare API token format is invalid'
  },
  {
    name: 'SUPABASE_URL_FORMAT',
    description: 'Supabase URL must be a valid Supabase domain',
    required: true,
    environments: ['production', 'staging', 'preview'],
    validation: (value: string) => /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/.test(value),
    errorMessage: 'Supabase URL must be a valid supabase.co domain'
  },
  {
    name: 'SUPABASE_PROJECT_ID_FORMAT',
    description: 'Supabase project ID must be properly formatted',
    required: true,
    environments: ['production', 'staging', 'preview'],
    validation: (value: string) => /^[a-zA-Z0-9]{20}$/.test(value),
    errorMessage: 'Supabase project ID format is invalid'
  },
  {
    name: 'SUPABASE_KEY_FORMAT',
    description: 'Supabase publishable key must be a valid JWT',
    required: true,
    environments: ['production', 'staging', 'preview'],
    validation: (value: string) => /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(value),
    errorMessage: 'Supabase publishable key must be a valid JWT token'
  },
  {
    name: 'NO_SERVICE_ROLE_KEY',
    description: 'Service role keys should not be used in frontend deployments',
    required: true,
    environments: ['production', 'staging', 'preview'],
    validation: (value: string) => !value.includes('service_role'),
    errorMessage: 'Service role keys should not be used in frontend applications'
  }
];

/**
 * Environment-specific security configurations
 */
export const ENVIRONMENT_SECURITY_CONFIGS: Record<string, EnvironmentSecurityConfig> = {
  production: {
    environment: 'production',
    requiredSecrets: [
      'CLOUDFLARE_API_TOKEN_PROD',
      'VITE_SUPABASE_URL_PROD',
      'VITE_SUPABASE_PROJECT_ID_PROD',
      'VITE_SUPABASE_PUBLISHABLE_KEY_PROD'
    ],
    optionalSecrets: [],
    securityPolicies: SECURITY_POLICIES,
    fallbackSecrets: {
      'CLOUDFLARE_API_TOKEN_PROD': 'CLOUDFLARE_API_TOKEN',
      'VITE_SUPABASE_URL_PROD': 'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PROJECT_ID_PROD': 'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_PUBLISHABLE_KEY_PROD': 'VITE_SUPABASE_PUBLISHABLE_KEY'
    }
  },
  staging: {
    environment: 'staging',
    requiredSecrets: [
      'CLOUDFLARE_API_TOKEN_STAGING',
      'VITE_SUPABASE_URL_STAGING',
      'VITE_SUPABASE_PROJECT_ID_STAGING',
      'VITE_SUPABASE_PUBLISHABLE_KEY_STAGING'
    ],
    optionalSecrets: [],
    securityPolicies: SECURITY_POLICIES,
    fallbackSecrets: {
      'CLOUDFLARE_API_TOKEN_STAGING': 'CLOUDFLARE_API_TOKEN',
      'VITE_SUPABASE_URL_STAGING': 'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PROJECT_ID_STAGING': 'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_PUBLISHABLE_KEY_STAGING': 'VITE_SUPABASE_PUBLISHABLE_KEY'
    }
  },
  preview: {
    environment: 'preview',
    requiredSecrets: [
      'CLOUDFLARE_API_TOKEN',
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_PROJECT_ID',
      'VITE_SUPABASE_PUBLISHABLE_KEY'
    ],
    optionalSecrets: [],
    securityPolicies: SECURITY_POLICIES,
    fallbackSecrets: {}
  }
};

/**
 * Validate secret value against security policies
 */
export function validateSecretSecurity(secretName: string, value: string, environment: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get base secret name (remove environment suffix)
  const baseSecretName = secretName.replace(/_PROD$|_STAGING$/, '');
  
  // Apply relevant security policies
  for (const policy of SECURITY_POLICIES) {
    if (!policy.environments.includes(environment)) {
      continue;
    }

    // Check if policy applies to this secret
    const appliesToSecret = 
      (baseSecretName.includes('CLOUDFLARE') && policy.name.includes('CLOUDFLARE')) ||
      (baseSecretName.includes('SUPABASE_URL') && policy.name.includes('SUPABASE_URL')) ||
      (baseSecretName.includes('SUPABASE_PROJECT_ID') && policy.name.includes('SUPABASE_PROJECT_ID')) ||
      (baseSecretName.includes('SUPABASE_PUBLISHABLE_KEY') && policy.name.includes('SUPABASE_KEY')) ||
      (baseSecretName.includes('SUPABASE') && policy.name === 'NO_SERVICE_ROLE_KEY');

    if (!appliesToSecret) {
      continue;
    }

    // Validate against policy
    if (policy.validation && !policy.validation(value)) {
      if (policy.required) {
        errors.push(policy.errorMessage || `Security policy violation: ${policy.name}`);
      } else {
        warnings.push(policy.errorMessage || `Security policy warning: ${policy.name}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get security configuration for environment
 */
export function getEnvironmentSecurityConfig(environment: string): EnvironmentSecurityConfig | null {
  return ENVIRONMENT_SECURITY_CONFIGS[environment] || null;
}

/**
 * Validate all secrets for an environment
 */
export function validateEnvironmentSecrets(environment: string, secrets: Record<string, string>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingSecrets: string[];
} {
  const config = getEnvironmentSecurityConfig(environment);
  if (!config) {
    return {
      valid: false,
      errors: [`Unknown environment: ${environment}`],
      warnings: [],
      missingSecrets: []
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const missingSecrets: string[] = [];

  // Check required secrets
  for (const secretName of config.requiredSecrets) {
    const value = secrets[secretName];
    const fallbackValue = secrets[config.fallbackSecrets[secretName]];
    
    if (!value && !fallbackValue) {
      missingSecrets.push(secretName);
      continue;
    }

    // Validate the secret that will be used
    const actualValue = value || fallbackValue;
    const actualSecretName = value ? secretName : config.fallbackSecrets[secretName];
    
    const validation = validateSecretSecurity(actualSecretName, actualValue, environment);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  }

  return {
    valid: errors.length === 0 && missingSecrets.length === 0,
    errors,
    warnings,
    missingSecrets
  };
}

/**
 * Generate security report for GitHub Actions workflow
 */
export function generateSecurityReport(environment: string, secrets: Record<string, string>): string {
  const validation = validateEnvironmentSecrets(environment, secrets);
  
  let report = `# GitHub Actions Security Report - ${environment.toUpperCase()}\n\n`;
  
  if (validation.valid) {
    report += '✅ **Security Status: PASSED**\n\n';
    report += 'All required secrets are present and pass security validation.\n\n';
  } else {
    report += '❌ **Security Status: FAILED**\n\n';
  }

  if (validation.missingSecrets.length > 0) {
    report += '## Missing Secrets\n\n';
    for (const secret of validation.missingSecrets) {
      report += `- ❌ ${secret}\n`;
    }
    report += '\n';
  }

  if (validation.errors.length > 0) {
    report += '## Security Errors\n\n';
    for (const error of validation.errors) {
      report += `- ❌ ${error}\n`;
    }
    report += '\n';
  }

  if (validation.warnings.length > 0) {
    report += '## Security Warnings\n\n';
    for (const warning of validation.warnings) {
      report += `- ⚠️ ${warning}\n`;
    }
    report += '\n';
  }

  report += '## Security Recommendations\n\n';
  report += '- Use environment-specific secrets for production and staging\n';
  report += '- Rotate API tokens every 90 days\n';
  report += '- Monitor secret usage in Cloudflare and Supabase dashboards\n';
  report += '- Enable additional security features like IP restrictions\n';
  report += '- Use separate Supabase projects for different environments\n\n';

  report += '## Next Steps\n\n';
  if (validation.valid) {
    report += '- Deployment can proceed safely\n';
    report += '- Monitor deployment logs for any issues\n';
  } else {
    report += '- Fix missing secrets and security issues\n';
    report += '- Re-run security validation\n';
    report += '- Do not proceed with deployment until issues are resolved\n';
  }

  return report;
}

/**
 * Security best practices for GitHub Actions
 */
export const SECURITY_BEST_PRACTICES = {
  secrets: [
    'Use environment-specific secrets for production and staging',
    'Never expose secrets in logs or error messages',
    'Rotate API tokens regularly (every 90 days)',
    'Use principle of least privilege for API tokens',
    'Monitor secret usage and access patterns'
  ],
  tokens: [
    'Limit Cloudflare API tokens to specific projects and zones',
    'Set expiration dates for all API tokens',
    'Use IP restrictions when possible',
    'Revoke unused or compromised tokens immediately',
    'Audit token permissions regularly'
  ],
  supabase: [
    'Use publishable keys only (never service role keys in frontend)',
    'Enable Row Level Security (RLS) on all tables',
    'Use separate projects for different environments',
    'Monitor database access logs',
    'Keep Supabase client libraries updated'
  ],
  workflow: [
    'Validate secrets before deployment',
    'Use GitHub environment protection rules',
    'Enable branch protection for main and develop branches',
    'Require status checks before merging',
    'Use deployment environments for additional security'
  ]
};

/**
 * Get security checklist for environment
 */
export function getSecurityChecklist(environment: string): string[] {
  const checklist: string[] = [];
  
  checklist.push(...SECURITY_BEST_PRACTICES.secrets);
  checklist.push(...SECURITY_BEST_PRACTICES.tokens);
  checklist.push(...SECURITY_BEST_PRACTICES.supabase);
  checklist.push(...SECURITY_BEST_PRACTICES.workflow);
  
  // Add environment-specific items
  if (environment === 'production') {
    checklist.push('Use production-specific API tokens and secrets');
    checklist.push('Enable additional monitoring and alerting');
    checklist.push('Implement backup and disaster recovery procedures');
  }
  
  if (environment === 'staging') {
    checklist.push('Use staging-specific API tokens and secrets');
    checklist.push('Test deployment process before production');
    checklist.push('Validate environment isolation');
  }
  
  return checklist;
}