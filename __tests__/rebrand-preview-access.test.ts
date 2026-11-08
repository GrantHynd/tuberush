import { canOpenRebrandPreview } from '@/lib/rebrand-preview-access';

describe('rebrand preview access', () => {
    it('opens only in a development bundle', () => {
        expect(canOpenRebrandPreview(true)).toBe(true);
        expect(canOpenRebrandPreview(false)).toBe(false);
    });
});
