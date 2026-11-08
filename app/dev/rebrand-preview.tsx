import RebrandPreviewScreen from '@/components/dev/RebrandPreview';
import { canOpenRebrandPreview } from '@/lib/rebrand-preview-access';
import { Redirect } from 'expo-router';

/**
 * Dev-only route. Metro remaps the screen module to a redirect stub when
 * bundling a production release, and this guard redirects if that remap
 * is not in effect.
 */
export default function RebrandPreviewRoute() {
    if (!canOpenRebrandPreview()) {
        return <Redirect href="/" />;
    }
    return <RebrandPreviewScreen />;
}
