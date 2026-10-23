import { privacyPolicy, termsOfUse, type InlinePart, type LegalBlock } from '@/lib/legal-copy';
import { privacyHtml, termsHtml } from '@/supabase/functions/legal/pages';
import fs from 'fs';
import path from 'path';

function inlineText(parts: InlinePart[]): string {
  return parts
    .map((part) => (typeof part === 'string' ? part : part.text))
    .join('');
}

function documentText(blocks: LegalBlock[], intro: InlinePart[]): string {
  return [
    inlineText(intro),
    ...blocks.map((block) => {
      if (block.type === 'h2') return block.text;
      if (block.type === 'ul') return block.items.join('\n');
      return inlineText(block.content);
    }),
  ].join('\n');
}

const privacy = fs.readFileSync(
  path.join(__dirname, '../supabase/functions/legal/privacy.html'),
  'utf8',
);
const terms = fs.readFileSync(
  path.join(__dirname, '../supabase/functions/legal/terms.html'),
  'utf8',
);

describe('hosted legal pages', () => {
  const inAppPrivacy = documentText(privacyPolicy.blocks, privacyPolicy.intro);
  const inAppTerms = documentText(termsOfUse.blocks, termsOfUse.intro);

  it('bundles the same HTML the function serves', () => {
    expect(privacyHtml).toBe(privacy);
    expect(termsHtml).toBe(terms);
  });

  it('describes the data the app actually sends to each provider', () => {
    for (const page of [privacy, inAppPrivacy]) {
      expect(page).toContain('Supabase');
      expect(page).toContain('PostHog');
      expect(page).toContain('eu.i.posthog.com');
      expect(page).toContain('Sentry');
      expect(page).toContain('RevenueCat');
      expect(page).toMatch(/in-app purchase/i);
      expect(page).toContain('card number');
      expect(page).toContain('Delete Account');
    }
  });

  it('states the auto-renewable subscription terms', () => {
    for (const page of [terms, inAppTerms]) {
      expect(page).toContain('EULA');
      expect(page).toContain('TubeRush Pro');
      expect(page).toMatch(/auto-renewable/i);
      expect(page).toContain('24 hours');
      expect(page).toContain('Privacy Policy');
      expect(page).toMatch(/in-app purchase/i);
    }
  });
});
