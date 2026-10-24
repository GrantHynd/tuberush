import { capture, identify, resetIdentity } from '@/lib/posthog';
import { userFromProfile, type ProfileRow } from '@/lib/profile';
import { setUser as setSentryUser } from '@/lib/sentry';
import { hasActiveEntitlement, logInRevenueCat, logOutRevenueCat } from '@/lib/revenuecat';
import { StorageManager } from '@/lib/storage-manager';
import { APP_SCHEME } from '@/constants/Games';
import { supabase } from '@/lib/supabase-client';
import { useGameStore } from '@/stores/game-store';
import type { User } from '@/types/game';
import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { create } from 'zustand';

/**
 * Resolve premium from RevenueCat only.
 * Purchases are native-only, so web is free. A lookup error is free, not a crash.
 */
async function resolvePremiumStatus(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        return false;
    }
    try {
        return await hasActiveEntitlement();
    } catch {
        return false;
    }
}

function syncSentryUser(
    user: { id: string; email?: string | null; username?: string | null } | null,
): void {
    if (!user) {
        setSentryUser(null);
        return;
    }

    setSentryUser({
        id: user.id,
        ...(user.email ? { email: user.email } : {}),
        ...(user.username ? { username: user.username } : {}),
    });
}

const DELETE_ACCOUNT_FAILURE = 'Could not delete your account. Please try again.';

/** Pull a safe message out of a failed `functions.invoke` response. */
async function readFunctionError(error: unknown): Promise<string> {
    if (!error || typeof error !== 'object') return DELETE_ACCOUNT_FAILURE;

    const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
    if (typeof context?.json === 'function') {
        try {
            const body = await context.json();
            if (
                body &&
                typeof body === 'object' &&
                typeof (body as { error?: unknown }).error === 'string'
            ) {
                return (body as { error: string }).error;
            }
        } catch {
            // Response body was empty or not JSON.
        }
    }

    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0 && !message.includes('non-2xx')) {
        return message;
    }
    return DELETE_ACCOUNT_FAILURE;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    pendingPasswordReset: boolean;
    signUp: (email: string, password: string, username?: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    checkSession: () => Promise<void>;
    refreshPremiumStatus: () => Promise<void>;
    refreshPremiumStatusFromRevenueCat: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
    resetPasswordForEmail: (email: string) => Promise<void>;
    updatePassword: (newPassword: string) => Promise<void>;
    setPendingPasswordReset: (pending: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    loading: true,
    pendingPasswordReset: false,

    signUp: async (email: string, password: string, username?: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: username ? { data: { username } } : undefined,
        });

        if (error) {
            throw error;
        }

        // Profile creation is handled by trigger in DB, but we might need to fetch it or wait
        // The trigger creates with default values.

        if (data.user) {
            capture('sign_up', { method: 'email' });
            syncSentryUser({
                id: data.user.id,
                email: data.user.email,
                username: username || data.user.user_metadata?.username,
            });
             set({
                user: {
                    id: data.user.id,
                    email: data.user.email!,
                    username: username || data.user.user_metadata?.username,
                    isPremium: false,
                },
                session: data.session,
            });
        }
    },

    signIn: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        if (data.user) {
            // Log in to RevenueCat with user ID for cross-device sync
            try {
                await logInRevenueCat(data.user.id);
            } catch (rcError) {
                console.warn('[Auth] RevenueCat login failed:', rcError);
            }

            identify(data.user.id, { email: data.user.email });
            capture('sign_in', { method: 'email' });

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            const isPremium = await resolvePremiumStatus();
            const signedInUser = userFromProfile({
                id: data.user.id,
                email: data.user.email!,
                isPremium,
                profile: profile as ProfileRow | null,
                metadataUsername: data.user.user_metadata?.username,
            });

            syncSentryUser(signedInUser);
            set({
                user: signedInUser,
                session: data.session,
            });
        }
    },

    signOut: async () => {
        try {
            await logOutRevenueCat();
        } catch {
            // Ignore RevenueCat logout errors
        }
        capture('sign_out');
        resetIdentity();
        syncSentryUser(null);
        await supabase.auth.signOut();
        set({ user: null, session: null });
    },

    deleteAccount: async () => {
        const { data, error } = await supabase.functions.invoke('delete-account', {
            method: 'POST',
        });

        if (error) {
            throw new Error(await readFunctionError(error));
        }
        if (data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string') {
            throw new Error((data as { error: string }).error);
        }

        // The auth user is already gone, so local cleanup must succeed even when
        // RevenueCat or the logout endpoint rejects the dead session.
        try {
            await logOutRevenueCat();
        } catch {
            // Ignore RevenueCat logout errors
        }
        capture('account_deleted');
        resetIdentity();
        syncSentryUser(null);
        try {
            await supabase.auth.signOut({ scope: 'local' });
        } catch {
            // A server sign-out can fail once the auth user no longer exists.
        }
        try {
            await StorageManager.clearLocalAccountData();
        } catch {
            // Cached games must not keep the deleted account on screen.
        }
        useGameStore.setState({ currentGame: null, gameHistory: [] });
        set({ user: null, session: null, pendingPasswordReset: false });
    },

    checkSession: async () => {
        set({ loading: true });

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            try {
                await logInRevenueCat(session.user.id);
            } catch {
                // Ignore if already logged in or RevenueCat not configured
            }

            identify(session.user.id, { email: session.user.email });

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            const isPremium = await resolvePremiumStatus();
            const restoredUser = userFromProfile({
                id: session.user.id,
                email: session.user.email!,
                isPremium,
                profile: profile as ProfileRow | null,
                metadataUsername: session.user.user_metadata?.username,
            });

            syncSentryUser(restoredUser);
            set({
                user: restoredUser,
                session,
                loading: false,
            });
        } else {
            syncSentryUser(null);
            set({ user: null, session: null, loading: false });
        }
    },

    refreshPremiumStatus: async () => {
        const user = get().user;
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        const isPremium = await resolvePremiumStatus();

        set({
            user: profile
                ? userFromProfile({
                    id: user.id,
                    email: user.email,
                    isPremium,
                    profile: profile as ProfileRow,
                    metadataUsername: user.username,
                })
                : { ...user, isPremium },
        });
    },

    refreshPremiumStatusFromRevenueCat: async () => {
        const user = get().user;
        if (!user) return;

        const isPremium = await resolvePremiumStatus();
        set({
            user: {
                ...user,
                isPremium,
            },
        });
    },

    updateProfile: async (updates: Partial<User>) => {
        const user = get().user;
        if (!user) return;

        // Map camelCase to snake_case if needed
        const dbUpdates: { city?: string | null; borough?: string | null; username?: string | null } = {};
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.borough !== undefined) dbUpdates.borough = updates.borough;
        if (updates.username !== undefined) {
            const trimmed = updates.username?.trim() || null;
            dbUpdates.username = trimmed;
            updates = { ...updates, username: trimmed ?? undefined };
        }

        if (Object.keys(dbUpdates).length === 0) return;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', user.id);

        if (error) throw error;

        if (dbUpdates.username !== undefined) {
            // Keep auth metadata in step so a later sign-in can't resurrect an old name.
            await supabase.auth.updateUser({ data: { username: dbUpdates.username } });
        }

        if (updates.city) {
            capture('location_updated', {
                city: updates.city,
                borough: updates.borough ?? null,
            });
        }

        set({ user: { ...user, ...updates } });
    },

    resetPasswordForEmail: async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${APP_SCHEME}://`,
        });
        if (error) throw error;
    },

    updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) throw error;
        set({ pendingPasswordReset: false });
        // Refresh session/profile after password update
        await get().checkSession();
    },

    setPendingPasswordReset: (pending: boolean) => {
        set({ pendingPasswordReset: pending });
    },
}));
