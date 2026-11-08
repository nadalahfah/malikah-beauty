import { createClient } from '@supabase/supabase-js';

// Masukkan URL dan ANON KEY dari Dashboard Supabase Anda
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jokjykwiyuoyuzlfcbij.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_c6ZH09FTz9ag6P8pChh_SQ_79GEXMPC";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);