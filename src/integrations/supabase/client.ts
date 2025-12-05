import { createClient } from '@supabase/supabase-js';

// Por favor, substitua 'SUA_CHAVE_ANON_AQUI' pela chave 'anon public' do seu projeto Supabase.
// Você pode encontrá-la em Project Settings > API no seu painel do Supabase.
const supabaseUrl = "https://tegyiuktrmcqxkbjxqoc.supabase.co";
const supabaseAnonKey = "SUA_CHAVE_ANON_AQUI"; 

console.log("Supabase URL sendo usado:", supabaseUrl);
console.log("Supabase Anon Key sendo usado:", supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);