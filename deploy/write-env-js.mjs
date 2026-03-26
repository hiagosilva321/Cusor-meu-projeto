#!/usr/bin/env node
/**
 * Gera env.js na pasta do site (wwwroot) a partir do .env do projeto.
 * Uso: node deploy/write-env-js.mjs /var/www/pedircacamba/.env /www/wwwroot/pedircacamba.com/env.js
 */
import fs from "fs";
import path from "path";
const envPath = process.argv[2] || ".env";
const outPath = process.argv[3] || "dist/env.js";
if (!fs.existsSync(envPath)) {
  console.error("Ficheiro .env não encontrado:", envPath);
  process.exit(1);
}
const text = fs.readFileSync(envPath, "utf8");
const vars = {};
for (const line of text.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 1) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  vars[k] = v;
}
const url = vars.VITE_SUPABASE_URL || "";
const key =
  vars.VITE_SUPABASE_PUBLISHABLE_KEY ||
  vars.VITE_SUPABASE_ANON_KEY ||
  "";
if (!url || !key) {
  console.error(
    "Falta VITE_SUPABASE_URL e uma chave: VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY",
  );
}
const turnstile = (vars.VITE_TURNSTILE_SITE_KEY || "").trim();
const cacambaClientApiKey = (vars.VITE_CACAMBA_CLIENT_API_KEY || "").trim();
const envObj = { supabaseUrl: url, supabaseAnonKey: key };
if (turnstile) envObj.turnstileSiteKey = turnstile;
if (cacambaClientApiKey) envObj.cacambaClientApiKey = cacambaClientApiKey;
const payload = JSON.stringify(envObj);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `window.__CACAMBAJA_ENV__=${payload};`, "utf8");
if (turnstile) console.log("OK: turnstileSiteKey incluído (login com CAPTCHA).");
console.log("OK:", outPath, url ? "(com URL)" : "(URL vazia — verifica .env)");
