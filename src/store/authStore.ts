import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types';

interface AuthState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    setProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    fetchProfile: (userId: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    profile: null,
    loading: true,

    setUser: (user) => set({ user }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),

    fetchProfile: async (userId: string) => {
        try {
            console.log('[fetchProfile] Calling get_my_profile RPC...');
            // Dùng RPC function có SECURITY DEFINER để bypass RLS
            const { data, error } = await supabase.rpc('get_my_profile');
            console.log('[fetchProfile] RPC result:', { data, error, userId });
            if (error) {
                console.error('[fetchProfile] RPC error:', error.message);
                // Fallback: thử query trực tiếp
                console.log('[fetchProfile] Trying fallback query...');
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();
                console.log('[fetchProfile] Fallback result:', { fallbackData, fallbackError });
                if (fallbackError) {
                    console.error('[fetchProfile] Fallback error:', fallbackError.message);
                    set({ profile: null });
                } else {
                    set({ profile: fallbackData as Profile | null });
                }
            } else {
                set({ profile: data as Profile | null });
            }
        } catch (err) {
            console.error('[fetchProfile] Exception:', err);
            set({ profile: null });
        }
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    },
}));
