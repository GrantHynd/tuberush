import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { getSyncPresentation, SyncStatusRow } from '@/components/ui/SyncStatusRow';
import { palette } from '@/constants/theme';

const colors = palette.light;

describe('SyncStatusRow (TUB-269)', () => {
    it('is passive when synced: no retry control', async () => {
        const { getByText, queryByLabelText } = await render(
            <SyncStatusRow syncStatus={{ status: 'synced', message: 'All changes synced' }} onRetry={jest.fn()} />,
        );
        expect(getByText('Synced')).toBeTruthy();
        expect(queryByLabelText('Retry sync')).toBeNull();
    });

    it('treats a missing status as synced', () => {
        expect(getSyncPresentation(undefined, colors)).toMatchObject({ label: 'Synced', canRetry: false });
    });

    it('does not offer retry while syncing or offline', () => {
        expect(getSyncPresentation({ status: 'syncing', message: '' }, colors).canRetry).toBe(false);
        expect(getSyncPresentation({ status: 'offline', message: 'Offline mode' }, colors).canRetry).toBe(false);
    });

    it('explains the failure and offers retry on error', async () => {
        const onRetry = jest.fn();
        const { getByText, getByLabelText } = await render(
            <SyncStatusRow
                syncStatus={{ status: 'error', message: '2 changes could not be synced' }}
                onRetry={onRetry}
            />,
        );
        expect(getByText('Sync failed')).toBeTruthy();
        expect(getByText(/2 changes could not be synced/)).toBeTruthy();
        await fireEvent.press(getByLabelText('Retry sync'));
        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('offers retry when changes are stale/pending', () => {
        expect(getSyncPresentation({ status: 'pending', message: '1 change pending' }, colors)).toMatchObject({
            label: 'Not synced yet',
            canRetry: true,
        });
    });
});
