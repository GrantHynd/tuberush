// Supabase Edge Function for handling Stripe webhooks
// Deploy this to Supabase Edge Functions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.5.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
    const signature = req.headers.get('Stripe-Signature');

    if (!signature) {
        return new Response('No signature', { status: 400 });
    }

    try {
        const body = await req.text();
        const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const userId = session.metadata?.user_id;

                if (userId && session.subscription) {
                    // Update profile to premium
                    await supabase
                        .from('profiles')
                        .update({
                            is_premium: true,
                            subscription_id: session.subscription,
                            subscription_status: 'active',
                        })
                        .eq('id', userId);
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as any;

                // Find user by subscription ID
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('subscription_id', subscription.id)
                    .single();

                if (profile) {
                    await supabase
                        .from('profiles')
                        .update({
                            is_premium: subscription.status === 'active',
                            subscription_status: subscription.status,
                        })
                        .eq('id', profile.id);

                    // Update subscriptions table
                    await supabase
                        .from('subscriptions')
                        .upsert({
                            id: subscription.id,
                            user_id: profile.id,
                            stripe_customer_id: subscription.customer,
                            stripe_subscription_id: subscription.id,
                            status: subscription.status,
                            price_id: subscription.items.data[0].price.id,
                            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
                            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
                        });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('subscription_id', subscription.id)
                    .single();

                if (profile) {
                    await supabase
                        .from('profiles')
                        .update({
                            is_premium: false,
                            subscription_status: 'canceled',
                        })
                        .eq('id', profile.id);
                }
                break;
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (err: any) {
        console.error('Webhook error:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
