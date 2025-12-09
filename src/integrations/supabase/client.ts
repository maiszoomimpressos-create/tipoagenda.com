import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente são acessadas via import.meta.env no Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A chave de service role é usada principalmente em Edge Functions ou em um ambiente de servidor seguro.
// Para o cliente frontend, geralmente não é exposta diretamente.
// No entanto, para fins de depuração ou se você tiver um caso de uso específico no cliente (com muito cuidado),
// você pode acessá-la, mas é altamente desencorajado expor chaves de service role no frontend.
// const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log("Supabase URL sendo usado:", supabaseUrl);
console.log("Supabase Anon Key sendo usado:", supabaseAnonKey);
console.log("Ambiente atual:", import.meta.env.MODE); // 'development' ou 'production'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);