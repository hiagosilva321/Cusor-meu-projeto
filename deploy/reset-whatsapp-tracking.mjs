#!/usr/bin/env node
/**
 * Zera histórico de cliques WhatsApp, contadores por número e numero_atribuido nos leads.
 * Desliga a rotação automática (modo "normal": peso + mesmo visitante no último clique).
 *
 * Requer api/.env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso: node deploy/reset-whatsapp-tracking.mjs
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

const env = loadEnv(apiEnvPath);
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(`Falta api/.env com SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (${apiEnvPath})`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const { error: delErr, count } = await supabase
    .from("whatsapp_clicks")
    .delete({ count: "exact" })
    .gte("created_at", "1970-01-01T00:00:00Z");
  if (delErr) {
    console.error("Erro ao apagar whatsapp_clicks:", delErr.message);
    process.exit(1);
  }
  console.log("OK — whatsapp_clicks removidos:", count ?? "(sem contagem)");

  const { error: upNumErr } = await supabase
    .from("whatsapp_numbers")
    .update({ click_count: 0 })
    .gte("click_count", 0);
  if (upNumErr) {
    console.error("Erro ao zerar click_count:", upNumErr.message);
    process.exit(1);
  }
  console.log("OK — whatsapp_numbers.click_count = 0");

  const { error: leadsErr } = await supabase
    .from("leads")
    .update({ numero_atribuido: "" })
    .not("id", "is", null);
  if (leadsErr) {
    console.warn("Aviso leads.numero_atribuido:", leadsErr.message);
  } else {
    console.log("OK — leads.numero_atribuido limpo");
  }

  const { data: st, error: stReadErr } = await supabase.from("site_settings").select("id").limit(1).maybeSingle();
  if (!stReadErr && st?.id) {
    const patch = { whatsapp_rotacao_ativa: false };
    const { error: stUp } = await supabase.from("site_settings").update(patch).eq("id", st.id);
    if (stUp) {
      if (String(stUp.message || "").includes("whatsapp_rotacao")) {
        console.warn("Colunas de rotação ainda não existem no site_settings — ignore ou aplique a migração SQL.");
      } else {
        console.warn("site_settings:", stUp.message);
      }
    } else {
      console.log("OK — rotação WhatsApp desligada (modo normal no painel)");
    }
  }

  console.log(`
Próximos passos (visitantes no browser):
  • Opcional: apagar no DevTools → Application → Local Storage as chaves
    cacamba_assigned_whatsapp_number_id (e cacamba_visitor_id se quiser novo ID).
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
