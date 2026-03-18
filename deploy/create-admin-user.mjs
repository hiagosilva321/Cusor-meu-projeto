#!/usr/bin/env node
/**
 * Cria ou atualiza utilizador admin no Supabase Auth.
 * Usa api/.env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) — tem de ser o MESMO projeto do .env da raiz.
 *
 * Uso:
 *   node deploy/create-admin-user.mjs admin@cacambaja.com "A_tua_senha_forte"
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error(
    "Uso: node deploy/create-admin-user.mjs <email> <senha>\n" +
      "Exemplo: node deploy/create-admin-user.mjs admin@cacambaja.com MinhaSenha123\n" +
      "Requer api/.env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY deste projeto.",
  );
  process.exit(1);
}

const env = loadEnv(apiEnvPath);
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Falta api/.env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (listErr) {
  console.error("Erro ao listar users:", listErr.message);
  process.exit(1);
}

const existing = list.users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Erro ao atualizar:", error.message);
    process.exit(1);
  }
  console.log("OK — senha atualizada para:", email);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    console.error("Erro ao criar:", error.message);
    process.exit(1);
  }
  console.log("OK — utilizador criado:", email);
}
