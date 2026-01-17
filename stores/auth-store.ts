import { supabase } from '@/lib/supabase-client';
import type { User } from '@/types/game';
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

        if (data.user) {
            // Create profile
            await supabase.from('profiles').insert({
                id: data.user.id,
                email: data.user.email,
                is_premium: false,
            });

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
            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            set({
                user: {
                    id: data.user.id,
                    email: data.user.email!,
                    isPremium: profile?.is_premium || false,
                    subscriptionId: profile?.subscription_id,
                    subscriptionStatus: profile?.subscription_status,
                },
                session: data.session,
            });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, session: null });
    },

    checkSession: async () => {
        set({ loading: true });

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            set({
                user: {
                    id: session.user.id,
                    email: session.user.email!,
                    isPremium: profile?.is_premium || false,
                    subscriptionId: profile?.subscription_id,
                    subscriptionStatus: profile?.subscription_status,
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

        if (profile) {
            set({
                user: {
                    ...user,
                    isPremium: profile.is_premium,
                    subscriptionId: profile.subscription_id,
                    subscriptionStatus: profile.subscription_status,
                },
            });
        }
    },
}));
