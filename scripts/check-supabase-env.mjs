#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");

if (!fs.existsSync(envPath)) {
  console.error("Crie o ficheiro .env na raiz do projeto a partir de .env.example.");
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
    console.log("Projeto na URL:", refFromUrl || "?");
    console.log("Projeto na chave anon:", refFromJwt || "?");

    if (refFromUrl && refFromJwt && refFromUrl === refFromJwt) {
      console.log("\n✓ URL e chave anon são do mesmo projeto.\n");
      process.exit(0);
    }

    console.error("\n✗ URL e chave anon estão desalinhadas.\n");
    process.exit(1);
  } catch {
    console.error("Chave JWT parece inválida.\n");
    process.exit(1);
  }
}

if (key.startsWith("sb_publishable_")) {
  console.log("Chave: publishable (sb_publishable_...)");
  console.log("Projeto na URL:", refFromUrl || "?");
  console.log("\n(Não dá para validar publishable vs URL neste script.)\n");
  process.exit(0);
}

console.error("Formato de chave não reconhecido.\n");
process.exit(1);
