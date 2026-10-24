import { getChosenDisplayName } from '@/lib/display-utils';
import { hasSeenDisplayNamePrompt, markDisplayNamePromptSeen } from '@/lib/display-name';
import { useAuthStore } from '@/stores/auth-store';
import React, { useEffect, useState } from 'react';
import { DisplayNameSheet } from './DisplayNameSheet';

/**
 * One-time "Choose a display name" sheet for signed-in users with no name (TUB-268).
 * Shown once per user id whether they save or skip.
 */
export function DisplayNamePrompt() {
    const user = useAuthStore((s) => s.user);
    const updateProfile = useAuthStore((s) => s.updateProfile);
    // id of the user we decided to prompt; derived visibility avoids setState-in-effect resets.
    const [promptFor, setPromptFor] = useState<string | null>(null);
    const userId = user?.id;
    const needsName = !!user && !getChosenDisplayName(user);

    useEffect(() => {
        let cancelled = false;
        if (!userId || !needsName) return;
        hasSeenDisplayNamePrompt(userId).then((seen) => {
            if (!cancelled && !seen) setPromptFor(userId);
        });
        return () => {
            cancelled = true;
        };
    }, [userId, needsName]);

    if (!userId) return null;
    const visible = promptFor === userId && needsName;

    const close = async () => {
        setPromptFor(null);
        await markDisplayNamePromptSeen(userId);
    };

    return (
        <DisplayNameSheet
            visible={visible}
            title="Choose a display name"
            dismissLabel="Skip"
            onSave={async (name) => {
                await updateProfile({ username: name });
                await close();
            }}
            onDismiss={close}
        />
    );
}
