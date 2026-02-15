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
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
        set({ profile: data as Profile | null });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    },
}));
