import { createClient } from '@supabase/supabase-js';

// Hardcodificando as chaves do Supabase para garantir o funcionamento imediato.
// ATENÇÃO: Em um ambiente de produção, estas chaves devem ser carregadas de variáveis de ambiente.
const supabaseUrl = "https://tegyiuktrmcqxkbjxqoc.supabase.co";
const supabaseAnonKey = "sb_publishable_1oa0srKkEMAj5EFjN9Fmrw_LFYyAuAM"; // Atualizado para a chave do seu painel

console.log("Supabase URL sendo usado:", supabaseUrl);
console.log("Supabase Anon Key sendo usado:", supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);