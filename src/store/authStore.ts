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
        // Helper timeout cho Supabase query
        const queryWithTimeout = <T,>(queryFn: () => PromiseLike<T>, ms: number, label: string): Promise<T> => {
            return new Promise<T>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error(`Timeout ${label} sau ${ms}ms`)), ms);
                Promise.resolve(queryFn()).then(
                    (result) => { clearTimeout(timer); resolve(result); },
                    (err) => { clearTimeout(timer); reject(err); }
                );
            });
        };

        // Cách 1: Query trực tiếp (dùng RLS policy "Users can view own profile" - id = auth.uid())
        try {
            console.log('[fetchProfile] Trying direct query...');
            const { data, error } = await queryWithTimeout(
                () => supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                5000, 'direct query'
            );
            if (!error && data) {
                console.log('[fetchProfile] Direct query OK:', data);
                set({ profile: data as Profile });
                return;
            }
            console.warn('[fetchProfile] Direct query failed:', error?.message || 'no data');
        } catch (err: any) {
            console.error('[fetchProfile] Direct query error:', err.message);
        }

        // Cách 2: RPC get_my_profile (SECURITY DEFINER bypass RLS)
        try {
            console.log('[fetchProfile] Trying RPC get_my_profile...');
            const { data, error } = await queryWithTimeout(
                () => supabase.rpc('get_my_profile'),
                5000, 'RPC'
            );
            if (!error && data) {
                console.log('[fetchProfile] RPC OK:', data);
                set({ profile: data as Profile });
                return;
            }
            console.warn('[fetchProfile] RPC failed:', error?.message || 'no data');
        } catch (err: any) {
            console.error('[fetchProfile] RPC error:', err.message);
        }

        console.error('[fetchProfile] All methods failed, profile = null');
        set({ profile: null });
    },

    signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
    },
}));
