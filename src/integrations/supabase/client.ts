import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://tegyiuktrmcqxkbjxqoc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3lpdWt0cm1jcXhrYmp4cW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDYxMDgsImV4cCI6MjA4MDUyMjEwOH0.bfwrlBY0Sg3u-MEdvSZlBMor6cd17iHBYlrpnhNgGEM"; 

console.log("Supabase URL sendo usado:", supabaseUrl);
console.log("Supabase Anon Key sendo usado:", supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);