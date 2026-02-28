import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Use the anonymous key for client-side authentication
const supabaseUrl = 'https://lkbesdmtazmgzujjoixf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2xrYmVzZG10YXptZ3p1ampvaXhmLnN1cGFiYXNlLmNvIiwic3ViIjoiYW5vbnltb3VzIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MjA4NzQ2NjYyMywiaWF0IjoxNzcyMTA2NjIzLCJyb2xlIjoiYW5vbiIsImFsZyI6IkhTMjU2In0.KLM72nGwoAVwlUdpBI26H8aF-4HFRo1IjXJPoe71skA';

console.log('🔍 Supabase Configuration:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey.length,
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
