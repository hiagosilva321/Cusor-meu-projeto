#!/usr/bin/env node
/**
 * Altera CAPTCHA (Turnstile) no Auth do projeto Supabase via Management API.
 *
 * 1) Supabase Dashboard → Account → Access Tokens → crie um token com permissão
 *    de escrita em Auth / projeto (ex.: "Organization" ou fine-grained com auth:write).
 * 2) Ficheiro deploy/supabase-management.env (não vai para o git):
 *      SUPABASE_ACCESS_TOKEN=sbp_...
 *      SUPABASE_PROJECT_REF=liuocutpghreoputefav
 *    Ou exporte essas variáveis no shell.
 *
 * Uso:
 *   node deploy/supabase-patch-auth-captcha.mjs off
 *   node deploy/supabase-patch-auth-captcha.mjs turnstile-test
 *   node deploy/supabase-patch-auth-captcha.mjs turnstile --secret SUA_SECRET_CLOUDFLARE
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const mgmtEnvPath = path.join(root, "deploy", "supabase-management.env");

function loadEnvFile(filePath) {
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

function refFromSupabaseUrl(url) {
  const m = String(url || "").match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return m ? m[1] : "";
}

const fileCfg = loadEnvFile(mgmtEnvPath);
const token = (process.env.SUPABASE_ACCESS_TOKEN || fileCfg.SUPABASE_ACCESS_TOKEN || "").trim();
let projectRef = (
  process.env.SUPABASE_PROJECT_REF ||
  fileCfg.SUPABASE_PROJECT_REF ||
  ""
).trim();

if (!projectRef) {
  const dotenvPath = path.join(root, ".env");
  const wwwEnv = "/var/www/pedircacamba/.env";
  for (const p of [dotenvPath, wwwEnv]) {
    if (fs.existsSync(p)) {
      const v = loadEnvFile(p).VITE_SUPABASE_URL || "";
      projectRef = refFromSupabaseUrl(v);
      if (projectRef) break;
    }
  }
}

const mode = (process.argv[2] || "").toLowerCase();
const args = process.argv.slice(3);
let customSecret = "";
const si = args.indexOf("--secret");
if (si >= 0 && args[si + 1]) customSecret = args[si + 1].trim();

if (!["off", "turnstile-test", "turnstile"].includes(mode)) {
  console.error(`
Uso:
  node deploy/supabase-patch-auth-captcha.mjs off
  node deploy/supabase-patch-auth-captcha.mjs turnstile-test
  node deploy/supabase-patch-auth-captcha.mjs turnstile --secret SUA_SECRET

Configure deploy/supabase-management.env (veja deploy/supabase-management.example.env)
ou exporte SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF.
`);
  process.exit(1);
}

if (!token) {
  console.error(
    `[ERRO] Falta SUPABASE_ACCESS_TOKEN.\n` +
      `Crie um token em https://supabase.com/dashboard/account/tokens\n` +
      `e guarde-o em ${mgmtEnvPath} (copie deploy/supabase-management.example.env).`,
  );
  process.exit(1);
}

if (!projectRef) {
  console.error(
    "[ERRO] Falta SUPABASE_PROJECT_REF (ou VITE_SUPABASE_URL num .env para extrair o ref).",
  );
  process.exit(1);
}

const API = "https://api.supabase.com";

/** @type {Record<string, unknown>} */
let body;
if (mode === "off") {
  body = { security_captcha_enabled: false };
} else if (mode === "turnstile-test") {
  body = {
    security_captcha_enabled: true,
    security_captcha_provider: "turnstile",
    security_captcha_secret: "1x0000000000000000000000000000000AA",
  };
} else {
  if (!customSecret) {
    console.error('[ERRO] Modo "turnstile" exige --secret com a Secret Key do Cloudflare.');
    process.exit(1);
  }
  body = {
    security_captcha_enabled: true,
    security_captcha_provider: "turnstile",
    security_captcha_secret: customSecret,
  };
}

const url = `${API}/v1/projects/${projectRef}/config/auth`;
const res = await fetch(url, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text };
}

if (!res.ok) {
  console.error(`[ERRO] HTTP ${res.status}`, json);
  process.exit(1);
}

console.log(`OK — projeto ${projectRef} atualizado (modo: ${mode}).`);
if (mode === "off") {
  console.log("CAPTCHA desligado no Auth (sign-in/sign-up conforme painel).");
} else {
  console.log("Turnstile ativo; confirme que o site usa a Site Key do mesmo widget (ou par de teste).");
}
