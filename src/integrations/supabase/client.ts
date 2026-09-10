import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// A chave publishable é pública por definição e pode ser enviada ao navegador.
// Variáveis de ambiente continuam tendo prioridade para outros ambientes.
const DEFAULT_SUPABASE_URL = 'https://hhwsqzaookfohqygihyc.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_QVg4BPLF4Pvu3JJk7FxMnw_mYAsuiO4';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigurationError = !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY
  ? 'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY não foram configuradas neste ambiente.'
  : null;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
