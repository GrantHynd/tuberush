/**
 * Integration test for is_premium column security
 * Tests that authenticated users cannot modify is_premium, while other fields work
 *
 * To run this test against a real Supabase instance:
 * 1. Set up test environment variables in .env.test
 * 2. Apply all migrations including 20260401000000_lock_is_premium_column.sql
 * 3. Run: npm test is-premium-security.test.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

// This test requires a real Supabase instance with the security migration applied
// It will be skipped if test credentials are not provided
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || '';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || '';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || '';

const shouldRunIntegrationTests = TEST_SUPABASE_URL && TEST_SUPABASE_ANON_KEY && TEST_SUPABASE_SERVICE_KEY;

describe('is_premium column security', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let testUserId: string;
  let testUserEmail: string;

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping is_premium security tests: TEST_SUPABASE_* env vars not set');
      return;
    }

    // Create authenticated client (simulates regular user)
    authenticatedClient = createClient<Database>(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create service role client (simulates backend webhook/purchase verification)
    serviceClient = createClient<Database>(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create a test user
    testUserEmail = `test-${Date.now()}@example.com`;
    const { data: signUpData, error: signUpError } = await authenticatedClient.auth.signUp({
      email: testUserEmail,
      password: 'TestPassword123!',
    });

    if (signUpError || !signUpData.user) {
      throw new Error(`Failed to create test user: ${signUpError?.message}`);
    }

    testUserId = signUpData.user.id;

    // Sign in as the test user
    const { error: signInError } = await authenticatedClient.auth.signInWithPassword({
      email: testUserEmail,
      password: 'TestPassword123!',
    });

    if (signInError) {
      throw new Error(`Failed to sign in test user: ${signInError.message}`);
    }
  });

  afterAll(async () => {
    if (!shouldRunIntegrationTests || !testUserId) return;

    // Clean up: delete test user (cascade will delete profile)
    await serviceClient.auth.admin.deleteUser(testUserId);
  });

  it('should prevent authenticated users from updating is_premium to true', async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping test: integration tests disabled');
      return;
    }

    // Try to update is_premium as authenticated user
    const { error } = await authenticatedClient
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', testUserId);

    // Should fail with an error
    expect(error).toBeTruthy();
    expect(error?.message).toContain('Cannot modify is_premium field');
  });

  it('should allow authenticated users to update other profile fields', async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping test: integration tests disabled');
      return;
    }

    // Update email (a field that users should be able to update)
    const newEmail = `updated-${Date.now()}@example.com`;
    const { error } = await authenticatedClient
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', testUserId);

    // Should succeed
    expect(error).toBeNull();

    // Verify the update worked
    const { data } = await authenticatedClient
      .from('profiles')
      .select('email')
      .eq('id', testUserId)
      .single();

    expect(data?.email).toBe(newEmail);
  });

  it('should prevent authenticated users from setting is_premium on profile creation', async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping test: integration tests disabled');
      return;
    }

    // Create another test user to test insert
    const newUserEmail = `test-insert-${Date.now()}@example.com`;
    const newAuthClient = createClient<Database>(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: signUpData, error: signUpError } = await newAuthClient.auth.signUp({
      email: newUserEmail,
      password: 'TestPassword123!',
    });

    if (signUpError || !signUpData.user) {
      throw new Error(`Failed to create test user: ${signUpError?.message}`);
    }

    const newUserId = signUpData.user.id;

    // Sign in
    await newAuthClient.auth.signInWithPassword({
      email: newUserEmail,
      password: 'TestPassword123!',
    });

    // Try to manually insert a profile with is_premium = true
    // (Note: normally profiles are auto-created by trigger, but let's test direct insert)
    const { error: insertError } = await newAuthClient
      .from('profiles')
      .insert({
        id: newUserId,
        email: newUserEmail,
        is_premium: true,
      });

    // Should fail
    expect(insertError).toBeTruthy();
    if (insertError) {
      expect(insertError.message).toContain('Cannot set is_premium to true on insert');
    }

    // Clean up
    await serviceClient.auth.admin.deleteUser(newUserId);
  });

  it('should allow service role to update is_premium', async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping test: integration tests disabled');
      return;
    }

    // Service role should be able to set is_premium to true
    const { error } = await serviceClient
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', testUserId);

    // Should succeed
    expect(error).toBeNull();

    // Verify the update worked
    const { data } = await serviceClient
      .from('profiles')
      .select('is_premium')
      .eq('id', testUserId)
      .single();

    expect(data?.is_premium).toBe(true);

    // Service role should also be able to set it back to false
    const { error: resetError } = await serviceClient
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', testUserId);

    expect(resetError).toBeNull();

    // Verify
    const { data: resetData } = await serviceClient
      .from('profiles')
      .select('is_premium')
      .eq('id', testUserId)
      .single();

    expect(resetData?.is_premium).toBe(false);
  });

  it('should prevent authenticated users from setting is_premium back to false', async () => {
    if (!shouldRunIntegrationTests) {
      console.warn('Skipping test: integration tests disabled');
      return;
    }

    // First, set is_premium to true using service role
    await serviceClient
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', testUserId);

    // Now try to set it back to false as authenticated user
    const { error } = await authenticatedClient
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', testUserId);

    // Should fail
    expect(error).toBeTruthy();
    expect(error?.message).toContain('Cannot modify is_premium field');

    // Verify is_premium is still true
    const { data } = await authenticatedClient
      .from('profiles')
      .select('is_premium')
      .eq('id', testUserId)
      .single();

    expect(data?.is_premium).toBe(true);

    // Clean up: reset to false for next tests
    await serviceClient
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', testUserId);
  });
});
