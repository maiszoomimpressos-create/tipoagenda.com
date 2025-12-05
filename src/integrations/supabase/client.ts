import { createClient } from '@supabase/supabase-js';

// Usando process.env para acessar as variáveis injetadas pelo Vite
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL não está definida nas variáveis de ambiente.');
}
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY não está definida nas variáveis de ambiente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);