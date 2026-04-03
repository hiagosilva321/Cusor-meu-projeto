import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function getSupabaseConfig(): { url: string; key: string } {
  const url = (import.meta.env.VITE_SUPABASE_URL as string) || "";
  const key =
    (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    "";
  return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    "[CaçambaJá] Falta Supabase: configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no ambiente do projeto."
  );
}

export const supabase = createClient<Database>(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** Front configurado com projeto Supabase real (não placeholder) */
export function isSupabaseClientConfigured(): boolean {
  const u = SUPABASE_URL || "";
  const k = SUPABASE_PUBLISHABLE_KEY || "";
  return Boolean(
    u && k && !u.includes("placeholder.supabase.co") && k.length > 40,
  );
}
