import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Only a publishable key belongs in the browser. Authorization is enforced by RLS.
export const supabase = url && key ? createClient(url, key) : null;
