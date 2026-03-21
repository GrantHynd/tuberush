import { capture, identify, resetIdentity } from '@/lib/posthog';
import { hasActiveEntitlement, logInRevenueCat, logOutRevenueCat } from '@/lib/revenuecat';
import { APP_SCHEME } from '@/constants/Games';
import { supabase } from '@/lib/supabase-client';
import type { User } from '@/types/game';
import { BOROUGHS } from '@/constants/Boroughs';
import { Platform } from 'react-native';
import { create } from 'zustand';

/**
 * Resolve the user's premium status.
 * On native platforms RevenueCat is the source of truth; Supabase is the fallback.
 */
async function resolvePremiumStatus(supabaseValue: boolean): Promise<boolean> {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
            return await hasActiveEntitlement();
        } catch {
            // Fall back to Supabase value on error
        }
    }
    return supabaseValue;
}

/** Normalize profile: borough-only (legacy) → city=London, borough=value */
function normalizeProfile(profile: { city?: string | null; borough?: string | null }) {
    const city = profile.city ?? (profile.borough && BOROUGHS.includes(profile.borough as any) ? 'London' : null);
    const borough = profile.borough && BOROUGHS.includes(profile.borough as any)
        ? (profile.borough as import('@/constants/Boroughs').Borough)
        : undefined;
    return { city, borough };
}

interface AuthState {
    user: User | null;
    session: any;
    loading: boolean;
    pendingPasswordReset: boolean;
    signUp: (email: string, password: string, username?: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
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

            // Check RevenueCat entitlement (source of truth for premium on native)
            const isPremium = await resolvePremiumStatus(profile?.is_premium || false);

            set({
                user: {
                    id: data.user.id,
                    email: data.user.email!,
                    isPremium,
                    subscriptionId: profile?.subscription_id,
                    subscriptionStatus: profile?.subscription_status,
                    expiresAt: profile?.expires_at,
                    appleOriginalTransactionId: profile?.apple_original_transaction_id,
                    ...normalizeProfile(profile || {}),
                },
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
        await supabase.auth.signOut();
        set({ user: null, session: null });
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

            const isPremium = await resolvePremiumStatus(profile?.is_premium || false);

            set({
                user: {
                    id: session.user.id,
                    email: session.user.email!,
                    isPremium,
                    subscriptionId: profile?.subscription_id,
                    subscriptionStatus: profile?.subscription_status,
                    expiresAt: profile?.expires_at,
                    appleOriginalTransactionId: profile?.apple_original_transaction_id,
                    ...normalizeProfile(profile || {}),
                },
                session,
                loading: false,
            });
        } else {
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

        const isPremium = await resolvePremiumStatus(profile?.is_premium ?? false);

        if (profile) {
            set({
                user: {
                    ...user,
                    isPremium,
                    subscriptionId: profile.subscription_id,
                    subscriptionStatus: profile.subscription_status,
                    expiresAt: profile.expires_at,
                    appleOriginalTransactionId: profile.apple_original_transaction_id,
                    ...normalizeProfile(profile),
                },
            });
        }
    },

    refreshPremiumStatusFromRevenueCat: async () => {
        const user = get().user;
        if (!user || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;

        try {
            const isPremium = await hasActiveEntitlement();
            set({
                user: {
                    ...user,
                    isPremium,
                },
            });
        } catch {
            // Ignore errors
        }
    },

    updateProfile: async (updates: Partial<User>) => {
        const user = get().user;
        if (!user) return;

        // Map camelCase to snake_case if needed
        const dbUpdates: any = {};
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.borough !== undefined) dbUpdates.borough = updates.borough;

        if (Object.keys(dbUpdates).length === 0) return;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', user.id);

        if (error) throw error;

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
