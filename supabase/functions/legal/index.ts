/**
 * Public privacy policy and terms of use pages.
 *
 * Supabase rewrites text/html responses to text/plain on the project domain, so
 * these pages are served as plain text. JWT verification must stay off.
 *
 * Deploy with:
 *   supabase functions deploy legal --no-verify-jwt --use-api --project-ref vhnvaohogdtlhgykfcrl
 *
 * Pages:
 *   /functions/v1/legal/privacy
 *   /functions/v1/legal/terms
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { privacyHtml, termsHtml } from './pages.ts';

const PRIVACY_URL = 'https://vhnvaohogdtlhgykfcrl.supabase.co/functions/v1/legal/privacy';
const TERMS_URL = 'https://vhnvaohogdtlhgykfcrl.supabase.co/functions/v1/legal/terms';

function toPlainText(html: string): string {
  const withoutStyle = html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '');
  const withBreaks = withoutStyle
    .replace(/<h1[^>]*>/gi, '\n')
    .replace(/<h2[^>]*>/gi, '\n\n')
    .replace(/<\/h[12]>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/(main|footer|ul|div)>/gi, '\n')
    .replace(/<a [^>]*href="mailto:([^"]+)"[^>]*>[\s\S]*?<\/a>/gi, '$1')
    .replace(/<a [^>]*href="terms(?:\.html)?"[^>]*>([\s\S]*?)<\/a>/gi, `$1: ${TERMS_URL}`)
    .replace(/<a [^>]*href="privacy(?:\.html)?"[^>]*>([\s\S]*?)<\/a>/gi, `$1: ${PRIVACY_URL}`)
    .replace(/<a [^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '');

  return withBreaks
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
}

const privacyText = toPlainText(privacyHtml);
const termsText = toPlainText(termsHtml);

function pageForPath(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '');
  if (path.endsWith('/privacy')) return privacyText;
  if (path.endsWith('/terms')) return termsText;
  return null;
}

const headers = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'public, max-age=300',
};

serve((req: Request) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const body = pageForPath(new URL(req.url).pathname);
  if (!body) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response(req.method === 'HEAD' ? null : body, { status: 200, headers });
});
