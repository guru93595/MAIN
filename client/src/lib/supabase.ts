import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Use the exact working configuration that we tested
const supabaseUrl = 'https://lkbesdmtazmgzujjoixf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrYmVzZG10YXptZ3p1ampvaXhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkwNDUxNiwiZXhwIjoyMDg3NDgwNTE2fQ.PJY5V-v6P1IT35Kp58Wn9BXn6es6QQTbDwKPmEgEIeI';

console.log('🔍 Supabase Configuration:', {
    url: supabaseUrl,
    keyLength: supabaseAnonKey.length,
    keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
