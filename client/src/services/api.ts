import axios, { type InternalAxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios';
import { supabase } from '../lib/supabase';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
console.log('Backend API Base URL:', baseURL);

// Create Axios Instance
const api = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Get token directly from Supabase client
api.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        let token: string | null = null;

        try {
            // Get current session directly from Supabase client
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Error getting session:', error);
            } else if (session?.access_token) {
                token = session.access_token;
                console.log('✅ Got token from Supabase client for:', config.method?.toUpperCase(), config.url);
            } else {
                console.log('❌ No session found in Supabase client');
            }
        } catch (e) {
            console.error('❌ Exception getting session:', e);
        }

        // Clean up old dev-bypass tokens
        try {
            const stored = localStorage.getItem('evara_session');
            if (stored) {
                const { user } = JSON.parse(stored);
                if (user?.id && typeof user.id === 'string' && user.id.startsWith('dev-bypass-')) {
                    console.log('Removing old dev-bypass token');
                    localStorage.removeItem('evara_session');
                }
            }
        } catch {
            // ignore
        }

        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
            console.log('🚀 API request with token:', config.method?.toUpperCase(), config.url);
        } else {
            console.log('❌ No valid token found for API request:', config.method?.toUpperCase(), config.url);
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response && error.response.status === 401) {
            console.log('401 Unauthorized - redirecting to login');
            // Clear any stored auth data and redirect to login
            localStorage.removeItem('evara_session');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
