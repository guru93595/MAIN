import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api from '../services/api';
import type { UserRole, UserPlan } from '../types/database';

/** Ensure backend has this user (creates/updates users_profiles). Call after login or session restore. */
const syncWithBackend = async (): Promise<void> => {
    try {
        await api.post('/auth/sync');
    } catch (err) {
        console.warn('Backend sync failed (user may still work):', err);
    }
};

// Re-export so existing imports from AuthContext continue to work
export type { UserRole, UserPlan };

export interface User {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    plan: UserPlan;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signup: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUser = async (uid: string): Promise<User | null> => {
    const { data: profile, error } = await supabase
        .from('users_profiles')
        .select('id, email, display_name, role, plan')
        .eq('id', uid)
        .single();
    if (error || !profile) return null;
    const p = profile as any;
    return {
        id: p.id,
        email: p.email,
        displayName: p.display_name,
        role: p.role,
        plan: p.plan,
    };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // ─── SESSION PERSISTENCE CONSTANTS ───
    const SESSION_KEY = 'evara_session';
    const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

    useEffect(() => {
        let mounted = true;

        // ─── CLEANUP OLD DEV-BYPASS DATA ON STARTUP ───
        const cleanupDevBypass = () => {
            try {
                const stored = localStorage.getItem(SESSION_KEY);
                if (stored) {
                    const { user: storedUser } = JSON.parse(stored);
                    if (storedUser?.id && storedUser.id.startsWith('dev-bypass-')) {
                        console.log('Cleaning up old dev-bypass session on startup');
                        localStorage.removeItem(SESSION_KEY);
                    }
                }
            } catch (e) {
                console.error('Error during cleanup:', e);
            }
        };

        // Clean up immediately
        cleanupDevBypass();

        // 1. Check LocalStorage first for instant restore (but filter out dev-bypass)
        const tryRestoreSession = () => {
            try {
                const stored = localStorage.getItem(SESSION_KEY);
                if (stored) {
                    const { user: storedUser, timestamp } = JSON.parse(stored);
                    const age = Date.now() - timestamp;
                    
                    // Filter out dev-bypass users
                    if (storedUser?.id && storedUser.id.startsWith('dev-bypass-')) {
                        console.log('Removing old dev-bypass session from localStorage');
                        localStorage.removeItem(SESSION_KEY);
                        return false;
                    }
                    
                    if (age < SESSION_DURATION) {
                        console.log('Restoring valid session from localStorage');
                        setUser(storedUser);
                        setLoading(false);
                        return true; // Session restored
                    } else {
                        console.log('Session expired, clearing localStorage');
                        localStorage.removeItem(SESSION_KEY);
                    }
                }
            } catch (e) {
                console.error('Failed to restore session:', e);
                localStorage.removeItem(SESSION_KEY);
            }
            return false;
        };

        // Attempt restore
        const restored = tryRestoreSession();

        // Safety timeout: if Supabase takes too long and we haven't restored, stop loading
        const timer = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 5000);

        // 2. If not restored, listen to Supabase
        if (!restored) {
            supabase.auth.getSession().then(async ({ data: { session } }) => {
                if (session?.user) {
                    try {
                        const u = await buildUser(session.user.id);
                        if (mounted && u) {
                            setUser(u);
                            localStorage.setItem(SESSION_KEY, JSON.stringify({
                                user: u,
                                timestamp: Date.now()
                            }));
                            await syncWithBackend();
                        }
                    } catch (err) {
                        console.error("Error building user:", err);
                    }
                }
                if (mounted) setLoading(false);
            });
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    const u = await buildUser(session.user.id);
                    if (mounted && u) {
                        setUser(u);
                        localStorage.setItem(SESSION_KEY, JSON.stringify({
                            user: u,
                            timestamp: Date.now()
                        }));
                        await syncWithBackend();
                    }
                } else {
                    // Only clear if we don't have a valid custom session (handled by logout)
                    // But for strict supabase sync, we might want to clear. 
                    // However, we want to persist "Dev Bypass" sessions which Supabase doesn't know about.
                    // So we'll rely on explicit logout to clear the global state/storage.
                }
                if (mounted && !restored) setLoading(false);
            }
        );

        return () => {
            mounted = false;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    const login = useCallback(async (
        email: string, password: string
    ): Promise<{ success: boolean; error?: string }> => {
        // ─── DEV BYPASS DISABLED ───
        // Using only real Supabase authentication
        
        console.log('AuthContext: Attempting Supabase login with:', { email, passwordLength: password.length });
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            
            console.log('AuthContext: Supabase response:', { data: data?.user ? 'User found' : 'No user', error: error?.message });
            
            if (error) {
                console.error('AuthContext: Supabase login error:', error);
                
                // Provide specific error messages
                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, error: 'Incorrect email or password.' };
                } else if (error.message.includes('Email not confirmed')) {
                    return { success: false, error: 'Please confirm your email address.' };
                } else if (error.message.includes('Bad Request')) {
                    return { success: false, error: 'Invalid login credentials. Please check your email and password.' };
                } else {
                    return { success: false, error: error.message };
                }
            }
            
            if (!data.user) {
                console.error('AuthContext: No user data returned');
                return { success: false, error: 'Login failed: No user data returned.' };
            }

            console.log('AuthContext: Login successful, syncing with backend...');
            
            // Ensure backend has this user (Supabase stores session in localStorage; api interceptor will send it)
            await syncWithBackend();
            
            console.log('AuthContext: Backend sync completed');
            return { success: true };
            
        } catch (err) {
            console.error('AuthContext: Unexpected login error:', err);
            return { success: false, error: 'An unexpected error occurred during login.' };
        }
    }, []);

    const signup = useCallback(async (
        email: string, password: string, displayName: string
    ): Promise<{ success: boolean; error?: string }> => {
        const { data, error } = await supabase.auth.signUp({
            email, password,
            options: { data: { display_name: displayName } },
        });
        if (error || !data.user) return { success: false, error: error?.message ?? 'Sign-up failed' };
        return { success: true };
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem(SESSION_KEY);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
