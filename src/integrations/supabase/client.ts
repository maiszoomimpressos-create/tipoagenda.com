import { createClient } from '@supabase/supabase-js';

// Hardcodificando as chaves do Supabase para garantir o funcionamento imediato.
// ATENÇÃO: Em um ambiente de produção, estas chaves devem ser carregadas de variáveis de ambiente.
const supabaseUrl = "https://tegyiuktrmcqxkbjxqoc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlZ3lpdWt0cm1jcXhrYmp4cW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDYxMDgsImV4cCI6MjA4MDUyMjEwOH0.bfwrlBY0Sg3u-MEdvSZBMor6cd17iHBYlrpnhNgGEM"; // Chave anon atualizada

console.log("Supabase URL sendo usado:", supabaseUrl);
console.log("Supabase Anon Key sendo usado:", supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);