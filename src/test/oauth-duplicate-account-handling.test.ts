/**
 * Property-Based Test for Duplicate Account Handling
 * **Feature: google-auth-integration, Property 4: Duplicate account handling**
 * **Validates: Requirements 1.5**
 * 
 * Tests that for any Google account that already exists in the system, 
 * sign-up attempts should redirect to the sign-in flow instead of creating duplicates
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { detectDuplicateAccount, handleDuplicateAccount } from '@/lib/oauth-security';

describe('OAuth Duplicate Account Handling Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 4: Duplicate account handling
   * For any Google account that already exists in the system, sign-up attempts 
   * should redirect to the sign-in flow instead of creating duplicates
   */
  it('should detect duplicate accounts consistently for signup attempts', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          isSignupAttempt: fc.boolean(),
          // User creation scenarios
          userAge: fc.constantFrom('new', 'recent', 'old'),
          hasConfirmedEmail: fc.boolean(),
          identityCount: fc.integer({ min: 1, max: 3 }),
          identityAge: fc.constantFrom('new', 'recent', 'old'),
        }),
        ({ userId, email, isSignupAttempt, userAge, hasConfirmedEmail, identityCount, identityAge }) => {
          // Generate timestamps based on age
          const now = new Date();
          const getTimestamp = (age: string) => {
            switch (age) {
              case 'new':
                return new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
              case 'recent':
                return new Date(now.getTime() - 3 * 60 * 1000); // 3 minutes ago
              case 'old':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
              default:
                return now;
            }
          };

          const userCreatedAt = getTimestamp(userAge);
          const identityCreatedAt = getTimestamp(identityAge);

          // Create mock user object
          const mockUser = {
            id: userId,
            email: email,
            created_at: userCreatedAt.toISOString(),
            email_confirmed_at: hasConfirmedEmail ? userCreatedAt.toISOString() : null,
            identities: Array.from({ length: identityCount }, (_, index) => ({
              provider: index === 0 ? 'google' : 'email',
              id: `${userId}-${index}`,
              created_at: identityCreatedAt.toISOString(),
            })),
          };

          // Test duplicate detection
          const duplicateResult = detectDuplicateAccount(mockUser, isSignupAttempt);
          const handleResult = handleDuplicateAccount(mockUser, isSignupAttempt);

          if (!isSignupAttempt) {
            // Property: Non-signup attempts should never be flagged as duplicates
            expect(duplicateResult.isDuplicate).toBe(false);
            expect(handleResult.isDuplicate).toBe(false);
            expect(handleResult.shouldRedirect).toBe(false);
          } else {
            // Property: Signup attempts should be analyzed for duplicate indicators
            
            // Check if this should be detected as duplicate based on our logic
            const isRecentlyCreated = userAge === 'new';
            const hasOldIdentity = identityAge === 'old';
            const hasMultipleIdentities = identityCount > 1;
            const isOldUser = userAge === 'old' && hasConfirmedEmail;

            const shouldBeDuplicate = isOldUser || hasMultipleIdentities || hasOldIdentity;

            if (shouldBeDuplicate) {
              // Property: Accounts with duplicate indicators should be detected
              expect(duplicateResult.isDuplicate).toBe(true);
              expect(duplicateResult.reason).toBeDefined();
              expect(handleResult.isDuplicate).toBe(true);
              expect(handleResult.message).toContain('já está registrada');
            } else if (isRecentlyCreated && !hasConfirmedEmail && identityCount === 1 && identityAge === 'new') {
              // Property: Genuinely new accounts should not be flagged as duplicates
              expect(duplicateResult.isDuplicate).toBe(false);
              expect(handleResult.isDuplicate).toBe(false);
            }

            // Property: All duplicate detection results should be consistent
            expect(duplicateResult.isDuplicate).toBe(handleResult.isDuplicate);
          }

          // Property: Handle result should always have proper structure
          expect(typeof handleResult.isDuplicate).toBe('boolean');
          expect(typeof handleResult.shouldRedirect).toBe('boolean');
          
          if (handleResult.isDuplicate) {
            expect(handleResult.message).toBeDefined();
            expect(typeof handleResult.message).toBe('string');
            expect(handleResult.message!.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: User creation timestamp analysis
   */
  it('should analyze user creation timestamps correctly', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          minutesAgo: fc.integer({ min: 0, max: 60 * 24 }), // 0 to 24 hours ago
          hasConfirmedEmail: fc.boolean(),
        }),
        ({ userId, email, minutesAgo, hasConfirmedEmail }) => {
          const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000);
          
          const mockUser = {
            id: userId,
            email: email,
            created_at: createdAt.toISOString(),
            email_confirmed_at: hasConfirmedEmail ? createdAt.toISOString() : null,
            identities: [{
              provider: 'google',
              id: userId,
              created_at: createdAt.toISOString(),
            }],
          };

          const result = detectDuplicateAccount(mockUser, true);

          // Property: Users created more than 5 minutes ago with confirmed email should be duplicates
          if (minutesAgo > 5 && hasConfirmedEmail) {
            expect(result.isDuplicate).toBe(true);
            expect(result.reason).toContain('confirmed email');
          }

          // Property: Very recent users without confirmed email should not be duplicates
          if (minutesAgo <= 2 && !hasConfirmedEmail) {
            expect(result.isDuplicate).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple identity detection
   */
  it('should detect multiple identities correctly', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          identityProviders: fc.array(
            fc.constantFrom('google', 'email', 'github', 'facebook'),
            { minLength: 1, maxLength: 4 }
          ),
        }),
        ({ userId, email, identityProviders }) => {
          const now = new Date();
          const mockUser = {
            id: userId,
            email: email,
            created_at: now.toISOString(),
            email_confirmed_at: null,
            identities: identityProviders.map((provider, index) => ({
              provider,
              id: `${userId}-${index}`,
              created_at: now.toISOString(),
            })),
          };

          const result = detectDuplicateAccount(mockUser, true);

          // Property: Users with multiple identities should be detected as duplicates
          if (identityProviders.length > 1) {
            expect(result.isDuplicate).toBe(true);
            expect(result.reason).toContain('multiple authentication methods');
          } else {
            // Single identity users might or might not be duplicates based on other factors
            // This property doesn't guarantee they're not duplicates
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: OAuth identity age analysis
   */
  it('should analyze OAuth identity creation time correctly', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
          identityMinutesAgo: fc.integer({ min: 0, max: 60 }), // 0 to 1 hour ago
        }),
        ({ userId, email, identityMinutesAgo }) => {
          const now = new Date();
          const userCreatedAt = new Date(now.getTime() - 2 * 60 * 1000); // 2 minutes ago
          const identityCreatedAt = new Date(now.getTime() - identityMinutesAgo * 60 * 1000);

          const mockUser = {
            id: userId,
            email: email,
            created_at: userCreatedAt.toISOString(),
            email_confirmed_at: null,
            identities: [{
              provider: 'google',
              id: userId,
              created_at: identityCreatedAt.toISOString(),
            }],
          };

          const result = detectDuplicateAccount(mockUser, true);

          // Property: OAuth identities created more than 10 minutes ago should indicate duplicates
          if (identityMinutesAgo > 10) {
            expect(result.isDuplicate).toBe(true);
            expect(result.reason).toContain('previous session');
          }

          // Property: Very recent OAuth identities should not indicate duplicates by themselves
          if (identityMinutesAgo <= 1) {
            // This alone shouldn't make it a duplicate (other factors might)
            if (result.isDuplicate) {
              expect(result.reason).not.toContain('previous session');
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Message consistency
   */
  it('should provide consistent messages for duplicate accounts', async () => {
    await fc.assert(
      fc.property(
        fc.record({
          userId: fc.uuid(),
          email: fc.emailAddress(),
        }),
        ({ userId, email }) => {
          // Create a user that should be detected as duplicate
          const oldDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
          const mockUser = {
            id: userId,
            email: email,
            created_at: oldDate.toISOString(),
            email_confirmed_at: oldDate.toISOString(),
            identities: [{
              provider: 'google',
              id: userId,
              created_at: oldDate.toISOString(),
            }],
          };

          const result = handleDuplicateAccount(mockUser, true);

          if (result.isDuplicate) {
            // Property: Duplicate account messages should be user-friendly and informative
            expect(result.message).toBeDefined();
            expect(result.message).toContain('Google');
            expect(result.message).toContain('registrada');
            expect(result.message).toContain('automaticamente');
            
            // Property: Messages should not contain technical details
            expect(result.message).not.toContain('id');
            expect(result.message).not.toContain('timestamp');
            expect(result.message).not.toContain('identity');
            expect(result.message).not.toContain('error');
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});