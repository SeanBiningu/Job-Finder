import { createClient } from '@supabase/supabase-js';

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Keeping this export nullable lets the UI remain usable in local demo mode.
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured. Add the public URL and anon key to the deployment environment.');
  return supabase;
};
