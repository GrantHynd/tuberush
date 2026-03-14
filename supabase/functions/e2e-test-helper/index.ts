import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        const { action, secret } = await req.json();

        // Security Check: Verify secret key
        // Note: This secret is hardcoded in the client (in __DEV__ blocks) and server for E2E tests.
        // It ensures only authorized test clients can bypass payments.
        if (secret !== 'e2e_secret_9f8e7d6c5b4a3_DO_NOT_USE_IN_PROD_random_string_xyz') {
             throw new Error('Unauthorized: Invalid secret key.');
        }

        // 1. Verify User from Auth Token
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            throw new Error('User not authenticated');
        }

        // 2. Security Check: Only allow test emails
        if (!user.email?.startsWith('test_user_') && !user.email?.endsWith('@example.com')) {
            throw new Error('Unauthorized: This helper is only for test users.');
        }

        // 3. Perform Action
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        if (action === 'promote_premium') {
            const now = Date.now();
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            const { error: updateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    is_premium: true,
                    subscription_status: 'active',
                    subscription_id: `test_sub_${now}`,
                    apple_original_transaction_id: `test_apple_${now}`,
                    expires_at: expiresAt.toISOString(),
                })
                .eq('id', user.id);

            if (updateError) {
                throw new Error(`Update failed: ${updateError.message}`);
            }

            return new Response(JSON.stringify({ success: true, message: 'User promoted to premium' }), {
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        throw new Error('Invalid action');

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
});
