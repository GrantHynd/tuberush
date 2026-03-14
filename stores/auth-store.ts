import { hasActiveEntitlement, logInRevenueCat, logOutRevenueCat } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase-client';
import type { User } from '@/types/game';
import { Platform } from 'react-native';
import { create } from 'zustand';

interface AuthState {
    user: User | null;
    session: any;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkSession: () => Promise<void>;
    refreshPremiumStatus: () => Promise<void>;
    refreshPremiumStatusFromRevenueCat: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    loading: true,

    signUp: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            throw error;
        }

        // Profile creation is handled by trigger in DB, but we might need to fetch it or wait
        // The trigger creates with default values.

        if (data.user) {
             set({
                user: {
                    id: data.user.id,
                    email: data.user.email!,
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

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            // Check RevenueCat entitlement (source of truth for premium on native)
            let isPremium = profile?.is_premium || false;
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                try {
                    isPremium = await hasActiveEntitlement();
                } catch {
                    // Fall back to Supabase if RevenueCat fails
                }
            }

            set({
                user: {
                    id: data.user.id,
                    email: data.user.email!,
                    isPremium,
                    subscriptionId: profile?.subscription_id,
                    subscriptionStatus: profile?.subscription_status,
                    expiresAt: profile?.expires_at,
                    appleOriginalTransactionId: profile?.apple_original_transaction_id,
                    borough: profile?.borough,
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

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            let isPremium = profile?.is_premium || false;
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                try {
                    isPremium = await hasActiveEntitlement();
                } catch {
                    // Fall back to Supabase
                }
            }

            set({
                user: {
                    id: session.user.id,
                    email: session.user.email!,
                    isPremium,
                    subscriptionId: profile?.subscription_id,
                    subscriptionStatus: profile?.subscription_status,
                    expiresAt: profile?.expires_at,
                    appleOriginalTransactionId: profile?.apple_original_transaction_id,
                    borough: profile?.borough,
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

        let isPremium = profile?.is_premium ?? false;
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
            try {
                isPremium = await hasActiveEntitlement();
            } catch {
                // Keep Supabase value on error
            }
        }

        if (profile) {
            set({
                user: {
                    ...user,
                    isPremium,
                    subscriptionId: profile.subscription_id,
                    subscriptionStatus: profile.subscription_status,
                    expiresAt: profile.expires_at,
                    appleOriginalTransactionId: profile.apple_original_transaction_id,
                    borough: profile.borough,
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
        if (updates.borough !== undefined) dbUpdates.borough = updates.borough;
        // Add other fields as needed

        if (Object.keys(dbUpdates).length === 0) return;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', user.id);

        if (error) throw error;

        set({ user: { ...user, ...updates } });
    },
}));
