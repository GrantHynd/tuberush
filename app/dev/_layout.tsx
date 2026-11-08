import { canOpenRebrandPreview } from '@/lib/rebrand-preview-access';
import { Redirect, Slot } from 'expo-router';

/**
 * Dev routes stay out of a release bundle's navigation.
 * Slot keeps this group from adding its own stack header.
 */
export default function DevLayout() {
    if (!canOpenRebrandPreview()) {
        return <Redirect href="/" />;
    }
    return <Slot />;
}
