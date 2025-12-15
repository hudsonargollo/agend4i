/**
 * Deployment Status Reporting Property Tests
 * 
 * **Property 14: Deployment status reporting**
 * **Validates: Requirements 5.5**
 * 
 * Tests that for any GitHub-triggered deployment, the system reports deployment status 
 * back to the GitHub commit/pull request with deployment URLs.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { 
  GitHubDeploymentStatusReporter,
  createGitHubReporterFromEnv,
  type GitHubDeploymentConfig
} from '../lib/github-deployment-status.js'

// Mock fetch for testing
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to generate valid SHA strings efficiently
const generateSha = () => fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 40, maxLength: 40 }).map(arr => arr.join(''))

describe('Deployment Status Reporting Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Property 14: Deployment status reporting', () => {
    /**
     * **Property 14: Deployment status reporting**
     * **Validates: Requirements 5.5**
     */
    it('should report deployment status to GitHub for any valid deployment configuration', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate simple valid configurations
        fc.record({
          owner: fc.constantFrom('test-owner', 'github', 'microsoft'),
          repo: fc.constantFrom('test-repo', 'my-project', 'app'),
          token: fc.constant('ghp_1234567890123456789012345678901234567890'),
          sha: fc.constant('1234567890123456789012345678901234567890'),
          environment: fc.constantFrom('production', 'staging', 'preview') as fc.Arbitrary<'production' | 'staging' | 'preview'>,
          pullRequestNumber: fc.option(fc.constantFrom(1, 42, 123))
        }),
        // Generate simple status updates
        fc.record({
          status: fc.constantFrom('pending', 'success', 'failure', 'error') as fc.Arbitrary<'pending' | 'success' | 'failure' | 'error'>,
          description: fc.constantFrom('Test deployment', 'Deploy to production', 'Build failed'),
          url: fc.option(fc.constantFrom('https://example.com', 'https://test.com')),
          previewUrl: fc.option(fc.constantFrom('https://preview.com', 'https://staging.com')),
          buildTime: fc.option(fc.constantFrom(30000, 60000, 120000)),
          deployTime: fc.option(fc.constantFrom(15000, 30000, 45000)),
          error: fc.option(fc.constantFrom('Build error', 'Network timeout', 'Invalid config'))
        }),
        async (config, statusUpdate) => {
          // Clear previous mocks
          mockFetch.mockClear()
          
          // Mock successful GitHub API responses
          mockFetch
            .mockResolvedValueOnce({
              ok: true,
              status: 201,
              json: async () => ({ id: 12345 })
            })
            .mockResolvedValueOnce({
              ok: true,
              status: 201,
              json: async () => ({ id: 67890 })
            })
            .mockResolvedValueOnce({
              ok: true,
              status: 201,
              json: async () => ({ id: 54321 })
            })
            .mockResolvedValueOnce({
              ok: true,
              status: 201,
              json: async () => ({ id: 98765 })
            })

          const reporter = new GitHubDeploymentStatusReporter(config)
          
          const result = await reporter.reportDeploymentStatus({
            ...statusUpdate,
            createDeployment: true
          })

          // Property: For any valid configuration and status update, 
          // the system should successfully report status to GitHub
          expect(result.success).toBe(true)
          expect(result.error).toBeUndefined()
          
          // Should have made API calls to GitHub
          expect(mockFetch).toHaveBeenCalled()
          
          // Verify GitHub API endpoints were called correctly
          const calls = mockFetch.mock.calls
          const apiCalls = calls.map(call => call[0])
          
          // Should call deployments endpoint
          expect(apiCalls.some(url => 
            url.includes(`/repos/${config.owner}/${config.repo}/deployments`)
          )).toBe(true)
          
          // Should call commit status endpoint
          expect(apiCalls.some(url => 
            url.includes(`/repos/${config.owner}/${config.repo}/statuses/${config.sha}`)
          )).toBe(true)
          
          // If PR number provided, should call comments endpoint
          if (config.pullRequestNumber) {
            expect(apiCalls.some(url => 
              url.includes(`/repos/${config.owner}/${config.repo}/issues/${config.pullRequestNumber}/comments`)
            )).toBe(true)
          }
        }
      ), { numRuns: 10 })
    })

    it('should generate consistent deployment messages for any status and environment combination', () => {
      fc.assert(fc.property(
        // Generate GitHub configurations
        fc.record({
          owner: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/),
          repo: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/),
          token: fc.stringMatching(/^ghp_[a-zA-Z0-9]{36}$/),
          sha: generateSha(),
          environment: fc.constantFrom('production', 'staging', 'preview') as fc.Arbitrary<'production' | 'staging' | 'preview'>,
          pullRequestNumber: fc.option(fc.integer({ min: 1, max: 9999 }))
        }),
        // Generate message options
        fc.record({
          status: fc.constantFrom('pending', 'success', 'failure', 'error') as fc.Arbitrary<'pending' | 'success' | 'failure' | 'error'>,
          environment: fc.constantFrom('production', 'staging', 'preview'),
          url: fc.option(fc.webUrl()),
          previewUrl: fc.option(fc.webUrl()),
          buildTime: fc.option(fc.integer({ min: 1000, max: 300000 })),
          deployTime: fc.option(fc.integer({ min: 1000, max: 180000 })),
          error: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
          sha: fc.option(fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 7, maxLength: 40 }).map(arr => arr.join('')))
        }),
        (config, messageOptions) => {
          const reporter = new GitHubDeploymentStatusReporter(config)
          
          const message = reporter.generateDeploymentMessage(messageOptions)
          
          // Property: For any status and environment combination,
          // the generated message should be well-formed and contain required elements
          expect(typeof message).toBe('string')
          expect(message.length).toBeGreaterThan(0)
          
          // Should contain deployment status comment marker
          expect(message).toContain('<!-- deployment-status-comment -->')
          
          // Should contain deployment status header
          expect(message).toContain('## 🚀 Deployment Status')
          
          // Should contain the environment name
          expect(message.toLowerCase()).toContain(messageOptions.environment.toLowerCase())
          
          // Should contain appropriate status emoji and text
          const statusEmojis = {
            pending: '⏳',
            success: '✅',
            failure: '❌',
            error: '🚨'
          }
          expect(message).toContain(statusEmojis[messageOptions.status])
          
          // If URL provided, should contain it
          if (messageOptions.url) {
            expect(message).toContain(messageOptions.url)
          }
          
          // If preview URL provided and different from main URL, should contain it
          if (messageOptions.previewUrl && messageOptions.previewUrl !== messageOptions.url) {
            expect(message).toContain(messageOptions.previewUrl)
          }
          
          // If error provided for failure/error status, should contain it
          if ((messageOptions.status === 'failure' || messageOptions.status === 'error') && messageOptions.error) {
            expect(message).toContain(messageOptions.error)
          }
          
          // If performance metrics provided for success, should contain them
          if (messageOptions.status === 'success') {
            if (messageOptions.buildTime) {
              expect(message).toContain('Build time:')
            }
            if (messageOptions.deployTime) {
              expect(message).toContain('Deploy time:')
            }
          }
          
          // Should contain timestamp
          expect(message).toMatch(/Updated at \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/)
        }
      ), { numRuns: 100 })
    })

    it('should handle GitHub API errors gracefully for any error response', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate valid configurations
        fc.record({
          owner: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/),
          repo: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/),
          token: fc.stringMatching(/^ghp_[a-zA-Z0-9]{36}$/),
          sha: generateSha(),
          environment: fc.constantFrom('production', 'staging', 'preview') as fc.Arbitrary<'production' | 'staging' | 'preview'>
        }),
        // Generate error responses
        fc.record({
          status: fc.integer({ min: 400, max: 599 }),
          statusText: fc.constantFrom('Bad Request', 'Unauthorized', 'Forbidden', 'Not Found', 'Internal Server Error'),
          errorMessage: fc.option(fc.string({ minLength: 1, maxLength: 200 }))
        }),
        async (config, errorResponse) => {
          // Clear previous mocks
          mockFetch.mockClear()
          
          // Mock GitHub API error response
          mockFetch.mockResolvedValue({
            ok: false,
            status: errorResponse.status,
            statusText: errorResponse.statusText,
            json: async () => ({ 
              message: errorResponse.errorMessage || 'API Error',
              errors: []
            })
          })

          const reporter = new GitHubDeploymentStatusReporter(config)
          
          const result = await reporter.reportDeploymentStatus({
            status: 'success',
            description: 'Test deployment',
            createDeployment: true
          })

          // Property: For any GitHub API error, the system should handle it gracefully
          // and return a failure result with error information
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
          expect(typeof result.error).toBe('string')
          expect(result.error!.length).toBeGreaterThan(0)
          
          // Error message should contain relevant information
          expect(result.error).toMatch(/github|api|error|failed/i)
        }
      ), { numRuns: 50 })
    })

    it('should create valid GitHub API requests for any deployment configuration', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate configurations
        fc.record({
          owner: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/),
          repo: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/),
          token: fc.stringMatching(/^ghp_[a-zA-Z0-9]{36}$/),
          sha: generateSha(),
          environment: fc.constantFrom('production', 'staging', 'preview') as fc.Arbitrary<'production' | 'staging' | 'preview'>
        }),
        // Generate status updates with non-empty descriptions
        fc.record({
          status: fc.constantFrom('pending', 'success', 'failure', 'error') as fc.Arbitrary<'pending' | 'success' | 'failure' | 'error'>,
          description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          url: fc.option(fc.webUrl())
        }),
        async (config, statusUpdate) => {
          // Clear previous mocks and set up fresh mock for this test
          mockFetch.mockClear()
          mockFetch.mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({ id: 12345 })
          })

          const reporter = new GitHubDeploymentStatusReporter(config)
          
          const result = await reporter.createCommitStatus({
            status: statusUpdate.status,
            description: statusUpdate.description,
            targetUrl: statusUpdate.url
          })
          
          // Ensure the operation was successful
          expect(result).toHaveProperty('statusId')
          expect(result).not.toHaveProperty('error')

          // Property: For any valid configuration, the system should create
          // properly formatted GitHub API requests
          expect(mockFetch).toHaveBeenCalledTimes(1)
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining(`https://api.github.com/repos/${config.owner}/${config.repo}/statuses/${config.sha}`),
            expect.objectContaining({
              method: 'POST',
              headers: expect.objectContaining({
                'Authorization': `token ${config.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
              }),
              body: expect.stringContaining(statusUpdate.status)
            })
          )
          
          // Verify request body contains required fields
          const call = mockFetch.mock.calls[0]
          expect(call).toBeDefined()
          expect(call[1]).toBeDefined()
          expect(call[1].body).toBeDefined()
          
          const requestBody = JSON.parse(call[1].body)
          
          expect(requestBody.state).toBe(statusUpdate.status)
          expect(requestBody.description).toBe(statusUpdate.description)
          expect(requestBody.context).toContain(`cloudflare-pages/${config.environment}`)
          
          if (statusUpdate.url) {
            expect(requestBody.target_url).toBe(statusUpdate.url)
          }
        }
      ), { numRuns: 100 })
    })

    it('should validate environment variable detection for GitHub integration', () => {
      fc.assert(fc.property(
        // Generate environment variable sets
        fc.record({
          GITHUB_REPOSITORY_OWNER: fc.option(fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/)),
          GITHUB_REPOSITORY: fc.option(
            fc.tuple(
              fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/),
              fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/)
            ).map(([owner, repo]) => `${owner}/${repo}`)
          ),
          GITHUB_TOKEN: fc.option(fc.stringMatching(/^ghp_[a-zA-Z0-9]{36}$/)),
          GITHUB_SHA: fc.option(fc.hexaString({ minLength: 40, maxLength: 40 })),
          DEPLOYMENT_ENVIRONMENT: fc.option(fc.constantFrom('production', 'staging', 'preview')),
          GITHUB_EVENT_NAME: fc.option(fc.constantFrom('push', 'pull_request', 'workflow_dispatch')),
          GITHUB_EVENT_NUMBER: fc.option(fc.integer({ min: 1, max: 9999 }).map(n => n.toString()))
        }),
        (envVars) => {
          // Set up environment variables
          const originalEnv = { ...process.env }
          
          // Clear relevant env vars
          delete process.env.GITHUB_REPOSITORY_OWNER
          delete process.env.GITHUB_REPOSITORY
          delete process.env.GITHUB_TOKEN
          delete process.env.GITHUB_SHA
          delete process.env.DEPLOYMENT_ENVIRONMENT
          delete process.env.GITHUB_EVENT_NAME
          delete process.env.GITHUB_EVENT_NUMBER
          
          // Set test env vars
          Object.entries(envVars).forEach(([key, value]) => {
            if (value !== null) {
              process.env[key] = value
            }
          })
          
          try {
            const reporter = createGitHubReporterFromEnv()
            
            // Property: The system should only create a reporter when all required
            // environment variables are present and valid
            const hasValidRepo = envVars.GITHUB_REPOSITORY && 
              envVars.GITHUB_REPOSITORY.includes('/') && 
              envVars.GITHUB_REPOSITORY.split('/')[1] && 
              envVars.GITHUB_REPOSITORY.split('/')[1].trim() !== ''
            
            const hasRequiredVars = 
              envVars.GITHUB_REPOSITORY_OWNER &&
              hasValidRepo &&
              envVars.GITHUB_TOKEN &&
              envVars.GITHUB_SHA
            
            if (hasRequiredVars) {
              expect(reporter).not.toBeNull()
              expect(reporter).toBeInstanceOf(GitHubDeploymentStatusReporter)
            } else {
              expect(reporter).toBeNull()
            }
          } finally {
            // Restore original environment
            process.env = originalEnv
          }
        }
      ), { numRuns: 50 })
    })

    it('should handle pull request comment updates consistently', async () => {
      await fc.assert(fc.asyncProperty(
        // Generate PR configurations
        fc.record({
          owner: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/),
          repo: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/),
          token: fc.stringMatching(/^ghp_[a-zA-Z0-9]{36}$/),
          sha: generateSha(),
          environment: fc.constantFrom('production', 'staging', 'preview') as fc.Arbitrary<'production' | 'staging' | 'preview'>,
          pullRequestNumber: fc.integer({ min: 1, max: 9999 })
        }),
        // Generate comment scenarios
        fc.record({
          existingComment: fc.boolean(),
          commentId: fc.option(fc.integer({ min: 1, max: 999999 })),
          message: fc.string({ minLength: 10, maxLength: 1000 })
        }),
        async (config, scenario) => {
          // Clear previous mocks
          mockFetch.mockClear()
          
          // Mock responses for finding existing comments
          if (scenario.existingComment && scenario.commentId) {
            mockFetch
              .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => [{
                  id: scenario.commentId,
                  body: '<!-- deployment-status-comment -->\nExisting comment'
                }]
              })
              .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ id: scenario.commentId })
              })
          } else {
            mockFetch
              .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => []
              })
              .mockResolvedValueOnce({
                ok: true,
                status: 201,
                json: async () => ({ id: 12345 })
              })
          }

          const reporter = new GitHubDeploymentStatusReporter(config)
          
          const result = await reporter.addPullRequestComment(scenario.message, true)

          // Property: For any PR comment scenario, the system should handle
          // comment creation/updating consistently
          expect('error' in result || 'commentId' in result).toBe(true)
          
          if ('commentId' in result) {
            expect(typeof result.commentId).toBe('number')
            expect(result.commentId).toBeGreaterThan(0)
          }
          
          // Verify correct API calls were made
          const calls = mockFetch.mock.calls
          expect(calls.length).toBeGreaterThan(0)
          
          // Should have called comments endpoint
          const commentsCalls = calls.filter(call => 
            call[0].includes(`/repos/${config.owner}/${config.repo}/issues/${config.pullRequestNumber}/comments`)
          )
          expect(commentsCalls.length).toBeGreaterThan(0)
          
          // If existing comment, should have called PATCH, otherwise POST
          if (scenario.existingComment && scenario.commentId) {
            expect(calls.some(call => call[1].method === 'PATCH')).toBe(true)
          } else {
            expect(calls.some(call => call[1].method === 'POST')).toBe(true)
          }
        }
      ), { numRuns: 50 })
    })
  })

  describe('GitHub API Integration Validation', () => {
    it('should validate GitHub repository format requirements', () => {
      const validOwners = ['github', 'microsoft', 'google', 'my-org', 'user123']
      const validRepos = ['repo', 'my-repo', 'project_name', 'app.js', 'test-123']
      
      for (const owner of validOwners) {
        for (const repo of validRepos) {
          const config: GitHubDeploymentConfig = {
            owner,
            repo,
            token: 'ghp_1234567890123456789012345678901234567890',
            sha: '1234567890123456789012345678901234567890',
            environment: 'production'
          }
          
          expect(() => new GitHubDeploymentStatusReporter(config)).not.toThrow()
        }
      }
    })

    it('should validate GitHub token format requirements', () => {
      const validTokens = [
        'ghp_1234567890123456789012345678901234567890',
        'ghp_abcdefghijklmnopqrstuvwxyz1234567890abcd'
      ]
      
      for (const token of validTokens) {
        const config: GitHubDeploymentConfig = {
          owner: 'test-owner',
          repo: 'test-repo',
          token,
          sha: '1234567890123456789012345678901234567890',
          environment: 'production'
        }
        
        expect(() => new GitHubDeploymentStatusReporter(config)).not.toThrow()
      }
    })

    it('should validate commit SHA format requirements', () => {
      const validShas = [
        '1234567890123456789012345678901234567890',
        'abcdef1234567890abcdef1234567890abcdef12',
        'f1e2d3c4b5a6978563412078945612307896541'
      ]
      
      for (const sha of validShas) {
        const config: GitHubDeploymentConfig = {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'ghp_1234567890123456789012345678901234567890',
          sha,
          environment: 'production'
        }
        
        expect(() => new GitHubDeploymentStatusReporter(config)).not.toThrow()
      }
    })

    it('should validate deployment environment requirements', () => {
      const validEnvironments: Array<'production' | 'staging' | 'preview'> = ['production', 'staging', 'preview']
      
      for (const environment of validEnvironments) {
        const config: GitHubDeploymentConfig = {
          owner: 'test-owner',
          repo: 'test-repo',
          token: 'ghp_1234567890123456789012345678901234567890',
          sha: '1234567890123456789012345678901234567890',
          environment
        }
        
        expect(() => new GitHubDeploymentStatusReporter(config)).not.toThrow()
      }
    })
  })
})