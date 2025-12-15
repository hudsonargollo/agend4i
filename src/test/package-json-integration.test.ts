/**
 * Property-Based Tests for Package.json Integration Consistency
 * **Feature: cloudflare-deployment, Property 9: Package.json integration consistency**
 * **Validates: Requirements 4.3**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Helper function to parse package.json safely
function parsePackageJson(): any {
  const packageJsonPath = resolve(process.cwd(), 'package.json')
  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found')
  }
  return JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
}

// Helper function to check if a script exists and has expected content
function validateScriptIntegration(scripts: Record<string, string>, scriptName: string, expectedPatterns: string[]): boolean {
  if (!scripts[scriptName]) {
    return false
  }
  
  const script = scripts[scriptName]
  return expectedPatterns.every(pattern => script.includes(pattern))
}

// Helper function to check script dependencies
function checkScriptDependencies(scripts: Record<string, string>, mainScript: string, dependencies: string[]): boolean {
  if (!scripts[mainScript]) {
    return false
  }
  
  const script = scripts[mainScript]
  return dependencies.every(dep => scripts[dep] && script.includes(dep))
}

describe('Package.json Integration Consistency Properties', () => {
  it('Property 9.1: Deployment scripts should integrate with existing build scripts', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // Testing actual package.json, not generated data
        () => {
          const packageJson = parsePackageJson()
          const scripts = packageJson.scripts || {}
          
          // Property: Core build scripts should exist (existing functionality)
          expect(scripts['build']).toBeDefined()
          expect(scripts['build:staging']).toBeDefined()
          expect(scripts['build:production']).toBeDefined()
          
          // Property: Deployment scripts should exist
          expect(scripts['deploy:staging']).toBeDefined()
          expect(scripts['deploy:production']).toBeDefined()
          
          // Property: Deployment scripts should integrate with validation scripts
          expect(checkScriptDependencies(scripts, 'deploy:staging', ['validate:staging'])).toBe(true)
          expect(checkScriptDependencies(scripts, 'deploy:production', ['validate:production'])).toBe(true)
          
          // Property: Build orchestration scripts should exist for integration
          expect(scripts['build:orchestrate:staging']).toBeDefined()
          expect(scripts['build:orchestrate:production']).toBeDefined()
        }
      ),
      { numRuns: 100 }
    )
  })
  it('Property 9.2: Deployment scripts should not break existing script functionality', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('dev', 'build', 'lint', 'preview', 'test', 'test:watch'),
        (existingScript) => {
          const packageJson = parsePackageJson()
          const scripts = packageJson.scripts || {}
          
          // Property: Existing scripts should still be present and functional
          expect(scripts[existingScript]).toBeDefined()
          expect(typeof scripts[existingScript]).toBe('string')
          expect(scripts[existingScript].length).toBeGreaterThan(0)
          
          // Property: Existing scripts should not be modified by deployment integration
          // (They should maintain their original functionality)
          if (existingScript === 'build') {
            expect(scripts[existingScript]).toBe('vite build')
          } else if (existingScript === 'dev') {
            expect(scripts[existingScript]).toBe('vite')
          } else if (existingScript === 'test') {
            expect(scripts[existingScript]).toBe('vitest --run')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.3: Wrangler dependency should be properly integrated', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const packageJson = parsePackageJson()
          
          // Property: Wrangler should be in devDependencies
          expect(packageJson.devDependencies).toBeDefined()
          expect(packageJson.devDependencies['wrangler']).toBeDefined()
          expect(typeof packageJson.devDependencies['wrangler']).toBe('string')
          
          // Property: Wrangler version should be valid semver format
          const wranglerVersion = packageJson.devDependencies['wrangler']
          expect(wranglerVersion).toMatch(/^\^?\d+\.\d+\.\d+/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.4: Deployment scripts should follow consistent naming patterns', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('staging', 'production'),
        (environment) => {
          const packageJson = parsePackageJson()
          const scripts = packageJson.scripts || {}
          
          // Property: Environment-specific scripts should follow consistent patterns
          const deployScript = `deploy:${environment}`
          const buildScript = `build:${environment}`
          const validateScript = `validate:${environment}`
          
          expect(scripts[deployScript]).toBeDefined()
          expect(scripts[buildScript]).toBeDefined()
          expect(scripts[validateScript]).toBeDefined()
          
          // Property: Deploy scripts should include validation step
          expect(scripts[deployScript]).toContain(`validate:${environment}`)
          expect(scripts[deployScript]).toContain('deploy-executor.js')
          expect(scripts[deployScript]).toContain(environment)
        }
      ),
      { numRuns: 100 }
    )
  })
  it('Property 9.5: Script integration should preserve existing workflow compatibility', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const packageJson = parsePackageJson()
          const scripts = packageJson.scripts || {}
          
          // Property: All deployment-related scripts should be properly integrated
          const deploymentScripts = [
            'validate:deployment',
            'validate:staging', 
            'validate:production',
            'deploy:staging',
            'deploy:production',
            'deploy:preview',
            'verify:deployment',
            'build:orchestrate',
            'build:orchestrate:staging',
            'build:orchestrate:production'
          ]
          
          deploymentScripts.forEach(scriptName => {
            expect(scripts[scriptName]).toBeDefined()
            expect(typeof scripts[scriptName]).toBe('string')
            expect(scripts[scriptName].length).toBeGreaterThan(0)
          })
          
          // Property: Scripts should reference correct script files
          expect(scripts['validate:deployment']).toContain('validate-deployment.js')
          expect(scripts['deploy:staging']).toContain('deploy-executor.js')
          expect(scripts['deploy:production']).toContain('deploy-executor.js')
          expect(scripts['build:orchestrate']).toContain('build-orchestrator.js')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9.6: Package.json structure should remain valid after integration', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const packageJson = parsePackageJson()
          
          // Property: Package.json should maintain valid structure
          expect(packageJson.name).toBeDefined()
          expect(packageJson.version).toBeDefined()
          expect(packageJson.scripts).toBeDefined()
          expect(packageJson.dependencies).toBeDefined()
          expect(packageJson.devDependencies).toBeDefined()
          
          // Property: Required fields should be strings
          expect(typeof packageJson.name).toBe('string')
          expect(typeof packageJson.version).toBe('string')
          
          // Property: Scripts should be objects with string values
          expect(typeof packageJson.scripts).toBe('object')
          Object.values(packageJson.scripts).forEach(script => {
            expect(typeof script).toBe('string')
          })
          
          // Property: Dependencies should be objects with string values
          expect(typeof packageJson.dependencies).toBe('object')
          expect(typeof packageJson.devDependencies).toBe('object')
        }
      ),
      { numRuns: 100 }
    )
  })
})