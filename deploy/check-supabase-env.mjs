#!/usr/bin/env node
/**
 * Verifica se VITE_SUPABASE_URL e a chave anon (JWT) são do MESMO projeto.
 * Uso: node deploy/check-supabase-env.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
if (!fs.existsSync(envPath)) {
  console.error("Cria o ficheiro .env na raiz do projeto (copia de .env.example).");
  process.exit(1);
}
const text = fs.readFileSync(envPath, "utf8");
const url = text.match(/^\s*VITE_SUPABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");
const key =
  text.match(/^\s*VITE_SUPABASE_PUBLISHABLE_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") ||
  text.match(/^\s*VITE_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "");

const refFromUrl = url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1]?.toLowerCase();

console.log("\n=== Supabase .env ===\n");
console.log("URL:", url || "(vazio)");
if (!key) {
  console.log("Chave: (vazia)\n");
  process.exit(1);
}

if (key.startsWith("eyJ")) {
  try {
    const payload = key.split(".")[1];
    const pad = payload.length % 4 === 0 ? "" : "=".repeat(4 - (payload.length % 4));
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString("utf8"));
    const refFromJwt = (json.ref || "").toLowerCase();
    console.log("Projeto na URL: ", refFromUrl || "?");
    console.log("Projeto na chave anon:", refFromJwt || "?");
    if (refFromUrl && refFromJwt && refFromUrl === refFromJwt) {
      console.log("\n✓ URL e chave anon são do MESMO projeto. Podes usar npm run dev / npm run deploy.\n");
    } else {
      console.log(
        "\n✗ ERRO: URL e chave são de projetos DIFERENTES (ou URL inválida).\n" +
          "  No Supabase abre o projeto cujo URL aparece em Settings → API,\n" +
          "  separador Legacy → copia a chave ANON desse projeto para VITE_SUPABASE_PUBLISHABLE_KEY.\n",
      );
      process.exit(1);
    }
  } catch {
    console.log("Chave JWT parece inválida.\n");
    process.exit(1);
  }
} else if (key.startsWith("sb_publishable_")) {
  console.log("Chave: publishable (sb_publishable_...)");
  console.log("Projeto na URL:", refFromUrl || "?");
  console.log(
    "\n(Não dá para validar publishable vs URL neste script.)\n" +
      "Se tiveres 401, troca pela chave anon JWT (Legacy) do MESMO projeto da URL.\n",
  );
} else {
  console.log("Formato de chave não reconhecido.\n");
}
