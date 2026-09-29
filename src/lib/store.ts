import { createClient } from "@supabase/supabase-js";
export function db() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado.");
  return createClient(url, key, { auth: { persistSession: false } });
}
