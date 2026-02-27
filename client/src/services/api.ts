import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { supabase } from '../lib/supabase';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
console.log('Backend API Base URL:', baseURL);

// Create Axios Instance with timeout
const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000, // 15 second timeout for all requests
});

// Helper: Get session with timeout to prevent hanging
const getSessionWithTimeout = async (timeoutMs: number = 2000): Promise<string | null> => {
    return new Promise((resolve) => {
        // Set timeout to resolve with null (no token)
        const timeoutId = setTimeout(() => {
            console.warn('⏱️ Session fetch timed out after', timeoutMs, 'ms - continuing without auth');
            resolve(null);
        }, timeoutMs);
        
        // Try to get session
        supabase.auth.getSession()
            .then((result) => {
                clearTimeout(timeoutId);
                if (result.data?.session?.access_token) {
                    resolve(result.data.session.access_token);
                } else {
                    resolve(null);
                }
            })
            .catch((err) => {
                clearTimeout(timeoutId);
                console.warn('⚠️ Session fetch failed:', err);
                resolve(null);
            });
    });
};

// Request Interceptor: Get token with timeout protection
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        let token: string | null = null;

        try {
            // Get session with 2 second timeout to prevent infinite hang
            token = await getSessionWithTimeout(2000);
            
            if (token) {
                console.log('✅ Got token from Supabase for:', config.method?.toUpperCase(), config.url);
            } else {
                console.log('ℹ️ No Supabase session (using dev mode):', config.method?.toUpperCase(), config.url);
            }
        } catch (e) {
            console.warn('⚠️ Session check failed, continuing without token:', e);
        }

        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }
        
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle errors gracefully without forced redirect
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response && error.response.status === 401) {
            console.warn('401 Unauthorized API call. Continuing without forced redirect.');
            // Do not force logout or redirect to allow unauthenticated public views
        }
        return Promise.reject(error);
    }
);

export default api;
