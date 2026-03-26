/* Em produção: sobrescrito por deploy/write-env-js.mjs.
   turnstileSiteKey (teste Cloudflare): evita aviso no /admin em npm run dev. */
window.__CACAMBAJA_ENV__ = window.__CACAMBAJA_ENV__ || {
  supabaseUrl: "",
  supabaseAnonKey: "",
  turnstileSiteKey: "1x00000000000000000000AA",
  cacambaClientApiKey: "",
};
