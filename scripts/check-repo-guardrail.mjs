#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Arquivo obrigatório ausente: ${relativePath}`);
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`JSON inválido em ${relativePath}: ${message}`);
    return null;
  }
}

function ensureMissing(relativePath) {
  if (fs.existsSync(path.join(root, relativePath))) {
    failures.push(`Legado removido voltou ao repo: ${relativePath}`);
  }
}

function ensureContains(relativePath, pattern, label) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Arquivo obrigatório ausente: ${relativePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  if (!pattern.test(content)) {
    failures.push(`Leitura canônica ausente em ${relativePath}: ${label}`);
  }
}

function ensureNotContains(relativePath, pattern, label) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Arquivo obrigatório ausente: ${relativePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, "utf8");
  if (pattern.test(content)) {
    failures.push(`Referência legada proibida em ${relativePath}: ${label}`);
  }
}

[
  "api",
  "docker",
  "Dockerfile.api",
  "Dockerfile.frontend",
  "docker-compose.yml",
  "public/env.js",
  "deploy",
  "supabase/functions/create-admin",
  "MIGRATION_GUIDE.md",
].forEach(ensureMissing);

[
  ".github/workflows/ci.yml",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/00-governance/CODEBASE-MAP.md",
  "docs/01-architecture/ARCHITECTURE-DECISIONS.md",
  "factory.config.json",
  ".pipeline/state.json",
].forEach((file) => {
  if (!fs.existsSync(path.join(root, file))) {
    failures.push(`Arquivo obrigatório ausente: ${file}`);
  }
});

const pipelineState = readJson(".pipeline/state.json");
const factoryConfig = readJson("factory.config.json");

if (factoryConfig) {
  if (factoryConfig.pipeline?.state !== ".pipeline/state.json") {
    failures.push("factory.config.json precisa apontar para .pipeline/state.json como estado canônico");
  }

  for (const requiredFile of factoryConfig.required_files || []) {
    if (!fs.existsSync(path.join(root, requiredFile))) {
      failures.push(`Arquivo listado em factory.config.json ausente: ${requiredFile}`);
    }
  }
}

if (pipelineState && factoryConfig && factoryConfig.pipeline?.current_gate !== pipelineState.current_gate) {
  failures.push(
    `Gate divergente entre factory.config.json (${factoryConfig.pipeline?.current_gate || "?"}) e .pipeline/state.json (${pipelineState.current_gate || "?"})`,
  );
}

ensureContains("docs/ENDPOINT-REFERENCE.md", /functions\/v1\/get-order-status/, "get-order-status");
ensureContains("CLAUDE.md", /GitHub \+ Vercel/, "deploy canônico em GitHub + Vercel");
ensureContains("CLAUDE.md", /Supabase Edge Functions/, "runtime canônico em Edge Functions");
ensureContains(".pipeline/state.json", /"verdict": "GO"/, "verdict GO");
ensureContains(".pipeline/state.json", /"status": "go"/, "status go");

[
  "AGENTS.md",
  "CLAUDE.md",
  "docs/00-governance/CODEBASE-MAP.md",
  "docs/00-governance/REPOSITORY-CONTEXT-MAP.md",
  "docs/01-architecture/ARCHITECTURE-DECISIONS.md",
  "docs/ENDPOINT-REFERENCE.md",
  "README.md",
  "DEPLOY.md",
  "GITHUB-SUPABASE.md",
].forEach((file) => {
  ensureNotContains(file, /api\/server\.js|\/api\/create-pix-charge|\/api\/fastsoft-webhook/, "camada Express/API");
  ensureNotContains(file, /Docker|docker-compose|VPS|pm2|nginx|aaPanel|env\.js/i, "camada Docker/VPS/env.js");
});

if (failures.length > 0) {
  console.error("\n[repo-guardrail] NO-GO\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\n[repo-guardrail] GO\n");
