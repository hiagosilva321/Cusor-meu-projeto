#!/usr/bin/env node
/**
 * Cria o cliente "Pedir Caçamba" em ceo_clients (id fixo) e associa linhas antigas sem client_id.
 * Requer migração 20260326120000_ceo_clients_multitenant.sql aplicada.
 *
 * Uso:
 *   PEDIR_SITE_API_KEY="sua-chave-secreta" node deploy/seed-pedir-client.mjs
 *   node deploy/seed-pedir-client.mjs sua-chave-secreta
 *
 * Depois: coloque no .env da raiz do site VITE_CACAMBA_CLIENT_API_KEY=<a mesma chave em texto>
 * e regenere env.js (node deploy/write-env-js.mjs ...).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PEDIR_FIXED_ID, sha256ApiKey } = require("../api/lib/ceo-clients");

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiEnvPath = path.join(root, "api", ".env");

function loadEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const env = { ...loadEnv(apiEnvPath), ...loadEnv(path.join(root, ".env")) };
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Falta SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY em api/.env.");
  process.exit(1);
}

const apiKeyPlain = String(process.env.PEDIR_SITE_API_KEY || process.argv[2] || "").trim();
if (!apiKeyPlain) {
  console.error(
    "Defina PEDIR_SITE_API_KEY ou passe a chave como argumento:\n" +
      "  node deploy/seed-pedir-client.mjs \"chave-secreta\"",
  );
  process.exit(1);
}

const sb = createClient(url, key);
const hash = sha256ApiKey(apiKeyPlain);

const row = {
  id: PEDIR_FIXED_ID,
  name: "Pedir Caçamba",
  slug: "pedir-cacamba",
  code: "PEDIR",
  api_key_hash: hash,
  active: true,
};

const { error: upErr } = await sb.from("ceo_clients").upsert(row, { onConflict: "id" });
if (upErr) {
  console.error(upErr);
  process.exit(1);
}

for (const table of ["orders", "leads", "whatsapp_clicks"]) {
  const { error } = await sb.from(table).update({ client_id: PEDIR_FIXED_ID }).is("client_id", null);
  if (error) console.warn(`[${table}]`, error.message);
}

console.log("OK: cliente PEDIR criado/atualizado.");
console.log("No .env da raiz do site (e rebuild ou env.js):");
console.log(`  VITE_CACAMBA_CLIENT_API_KEY=${apiKeyPlain}`);
console.log("Na API (opcional, já é o default no código):");
console.log(`  DEFAULT_CLIENT_ID=${PEDIR_FIXED_ID}`);
