/**
 * Public pages served by the `legal` edge function.
 * Deploy with JWT verification disabled so a browser can open them:
 * supabase functions deploy legal --no-verify-jwt --use-api --project-ref vhnvaohogdtlhgykfcrl
 */
const LEGAL_BASE_URL = 'https://vhnvaohogdtlhgykfcrl.supabase.co/functions/v1/legal';

export const PRIVACY_POLICY_URL = `${LEGAL_BASE_URL}/privacy`;
export const TERMS_OF_USE_URL = `${LEGAL_BASE_URL}/terms`;

export const PRIVACY_POLICY_ROUTE = '/privacy' as const;
export const TERMS_OF_USE_ROUTE = '/terms' as const;
