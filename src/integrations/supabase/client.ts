import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurationError = !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY
  ? 'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não foram configuradas neste ambiente.'
  : null;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Valores seguros de reserva evitam uma tela branca no deploy quando o provedor
// não recebeu as variáveis. O aplicativo não é renderizado nesse cenário (main.tsx).
export const supabase = createClient<Database>(SUPABASE_URL ?? 'https://unconfigured.supabase.invalid', SUPABASE_PUBLISHABLE_KEY ?? 'unconfigured-publishable-key', {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
