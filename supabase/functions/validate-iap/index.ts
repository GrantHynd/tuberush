// Supabase Edge Function: Validate Apple IAP (StoreKit 2) receipts
// Verifies JWS transaction from client and updates profile subscription status

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'npm:jose@5.9.6';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppleTransactionPayload {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  purchaseDate?: number;
  expiresDate?: number;
  environment?: string;
  signedTransactionInfo?: string;
}

function base64UrlToBase64(str: string): string {
  return str.replace(/-/g, '+').replace(/_/g, '/');
}

function extractTransactionInfo(payload: AppleTransactionPayload): {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  expiresDate?: number;
} {
  if (payload.signedTransactionInfo) {
    const innerParts = payload.signedTransactionInfo.split('.');
    if (innerParts.length === 3) {
      const innerPayloadB64 = base64UrlToBase64(innerParts[1]);
      const innerPayload = JSON.parse(atob(innerPayloadB64)) as AppleTransactionPayload;
      return extractTransactionInfo(innerPayload);
    }
  }
  const transactionId = payload.transactionId;
  const originalTransactionId = payload.originalTransactionId;
  const productId = payload.productId;
  if (!transactionId || !originalTransactionId || !productId) {
    throw new Error('Invalid transaction payload: missing required fields');
  }
  return {
    transactionId,
    originalTransactionId,
    productId,
    expiresDate: payload.expiresDate,
  };
}

async function verifyAppleJws(
  jws: string
): Promise<{
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  expiresDate?: number;
}> {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWS format');
  }

  const headerB64 = base64UrlToBase64(parts[0]);
  const header = JSON.parse(atob(headerB64)) as { alg?: string; x5c?: string[] };
  const x5c = header.x5c;
  if (!x5c || !Array.isArray(x5c) || x5c.length === 0) {
    throw new Error('JWS missing x5c certificate chain');
  }

  const certB64 = x5c[0];
  const pem = `-----BEGIN CERTIFICATE-----\n${certB64}\n-----END CERTIFICATE-----`;

  const key = await jose.importX509(pem, header.alg || 'ES256');
  const { payload } = await jose.compactVerify(jws, key);
  const decoder = new TextDecoder();
  const rawPayload = JSON.parse(decoder.decode(payload)) as AppleTransactionPayload;
  return extractTransactionInfo(rawPayload);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { transactionJws } = body;

    if (!transactionJws || typeof transactionJws !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing transactionJws' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tx = await verifyAppleJws(transactionJws);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const expiresAt = tx.expiresDate
      ? new Date(tx.expiresDate).toISOString()
      : null;

    const isActive = !expiresAt || new Date(tx.expiresDate!) > new Date();

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({
        is_premium: isActive,
        subscription_status: isActive ? 'active' : 'expired',
        subscription_id: tx.transactionId,
        apple_original_transaction_id: tx.originalTransactionId,
        expires_at: expiresAt,
      })
      .eq('id', user.id);

    if (error) {
      throw new Error(`Profile update failed: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        isPremium: isActive,
        expiresAt,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Validation failed';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
