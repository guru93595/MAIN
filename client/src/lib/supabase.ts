import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Use env vars. For local dev: copy .env.example to .env. For Render: set in dashboard.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example)');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
