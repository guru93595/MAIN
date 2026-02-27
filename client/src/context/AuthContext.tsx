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

    // Hardcoded credentials for development
    const HARDCODED_USERS = {
        'admin@evaratech.com': {
            id: 'admin-001',
            email: 'admin@evaratech.com',
            displayName: 'Super Admin',
            role: 'superadmin' as UserRole,
            plan: 'enterprise' as UserPlan
        },
        'demo@evaratech.com': {
            id: 'demo-001',
            email: 'demo@evaratech.com',
            displayName: 'Demo User',
            role: 'superadmin' as UserRole,
            plan: 'enterprise' as UserPlan
        },
        'test@evaratech.com': {
            id: 'test-001',
            email: 'test@evaratech.com',
            displayName: 'Test User',
            role: 'superadmin' as UserRole,
            plan: 'enterprise' as UserPlan
        }
    };
    
    console.log('🔐 Available users:', Object.keys(HARDCODED_USERS));

    useEffect(() => {
        let mounted = true;

        // Check for existing session
        const tryRestoreSession = () => {
            try {
                const stored = localStorage.getItem('evara_session');
                if (stored) {
                    const { user: storedUser, timestamp } = JSON.parse(stored);
                    const age = Date.now() - timestamp;

                    if (age < 12 * 60 * 60 * 1000) {
                        console.log('Restoring valid session from localStorage');
                        setUser(storedUser);
                        setLoading(false);
                        return true; // Session restored
                    } else {
                        console.log('Session expired, clearing localStorage');
                        localStorage.removeItem('evara_session');
                    }
                }
            } catch (e) {
                console.error('Failed to restore session:', e);
                localStorage.removeItem('evara_session');
            }
            return false;
        };

        // Attempt restore
        const restored = tryRestoreSession();

        // Safety timeout
        const timer = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 5000);

        if (!restored) {
            setLoading(false);
        }

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, []);

    const loginFn = async (email: string, password: string, role?: string) => {
        setLoading(true);
        try {
            console.log('🔍 Attempting login with:', email);
            
            // Simple hardcoded authentication
            const hardcodedUser = HARDCODED_USERS[email as keyof typeof HARDCODED_USERS];
            
            if (hardcodedUser && password === 'admin123') {
                console.log('✅ Login successful with hardcoded credentials');
                setUser(hardcodedUser);
                
                // Store session
                localStorage.setItem('evara_session', JSON.stringify({
                    user: hardcodedUser,
                    timestamp: Date.now()
                }));
                
                setLoading(false);
                return hardcodedUser;
            } else {
                console.log('❌ Invalid credentials:', { email, password });
                throw new Error('Invalid email or password');
            }
        } catch (error: any) {
            console.error('❌ Login error:', error);
            setLoading(false);
            throw error;
        }
    };

    const signupFn = async (email: string, password: string, role: string, plan: string) => {
        setLoading(true);
        try {
            // For development, just use the login function
            return await loginFn(email, password, role);
        } catch (error) {
            setLoading(false);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('evara_session');
        setLoading(false);
    };

    const value: AuthContextType = {
        user,
        login: async (email: string, password: string) => {
            console.log('🔍 Login called with:', email, password);
            try {
                const result = await loginFn(email, password);
                console.log('✅ Login success:', result);
                
                // Don't redirect here - let the login page handle redirection
                // This prevents double redirects and conflicts
                
                return { success: true };
            } catch (error: any) {
                console.error('❌ Login failed:', error.message);
                return { success: false, error: error.message };
            }
        },
        signup: async (email: string, password: string, displayName: string) => {
            try {
                await signupFn(email, password, 'superadmin', 'enterprise');
                return { success: true };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        },
        logout: async () => {
            logout();
        },
        loading,
        isAuthenticated: !!user
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    
    // Add helper properties
    return {
        ...context,
        isAdmin: context.user?.role === 'superadmin',
        isCustomer: context.user?.role === 'customer',
        isDistributor: context.user?.role === 'distributor'
    };
};
