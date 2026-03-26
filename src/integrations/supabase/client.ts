import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

declare global {
  interface Window {
    __CACAMBAJA_ENV__?: {
      supabaseUrl: string;
      supabaseAnonKey: string;
      turnstileSiteKey?: string;
      /** Liga pedidos PIX ao cliente certo na API (hash na tabela ceo_clients). */
      cacambaClientApiKey?: string;
    };
  }
}

function getSupabaseConfig(): { url: string; key: string } {
  if (typeof window !== "undefined") {
    const w = window.__CACAMBAJA_ENV__;
    const urlW = (w?.supabaseUrl ?? "").trim();
    const keyW = (w?.supabaseAnonKey ?? "").trim();
    /** env.js no servidor (carrega antes do bundle) — corrige deploy antigo com URL errada */
    if (urlW.includes(".supabase.co") && keyW.length > 35) {
      return { url: urlW, key: keyW };
    }
  }
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
    "[CaçambaJá] Falta Supabase: faça npm run build com .env (VITE_*) ou coloque env.js no site — node deploy/write-env-js.mjs"
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