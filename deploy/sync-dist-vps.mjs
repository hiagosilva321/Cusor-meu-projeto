#!/usr/bin/env node
/**
 * Envia dist/ para a pasta remota (deploy/deploy-target.env).
 * Requer OpenSSH (ssh) no PATH.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const configFile = path.join(root, "deploy", "deploy-target.env");

function loadEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    out[k] = v;
  }
  return out;
}

const cfg = loadEnvFile(configFile);
const host = cfg.DEPLOY_HOST?.trim();
const user = cfg.DEPLOY_USER?.trim() || "root";
const remotePath = cfg.DEPLOY_PATH?.trim().replace(/\\/g, "/").replace(/\/$/, "");
const sshKey = cfg.DEPLOY_SSH_KEY?.trim();

if (!host || !remotePath) {
  console.error(`
[ERRO] Configura deploy/deploy-target.env (copia de deploy-target.example.env)

  DEPLOY_HOST=...
  DEPLOY_USER=root
  DEPLOY_PATH=/www/wwwroot/TEU_DOMINIO.com
`);
  process.exit(1);
}

const dist = path.join(root, "dist");
if (!fs.existsSync(path.join(dist, "index.html"))) {
  console.error("[ERRO] Corre primeiro: npm run deploy");
  process.exit(1);
}

const sshOpts = ["-o", "StrictHostKeyChecking=accept-new", ...(sshKey ? ["-i", path.resolve(root, sshKey)] : [])];

function runTarPipe() {
  const remoteDir = remotePath.replace(/'/g, "'\\''");
  const distAbs = path.resolve(dist);
  const tarBin = process.platform === "win32" ? "tar.exe" : "tar";

  return new Promise((resolve, reject) => {
    const tar = spawn(tarBin, ["-cf", "-", "-C", distAbs, "."], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const sshArgs = [
      ...sshOpts,
      `${user}@${host}`,
      `set -e; mkdir -p '${remoteDir}'; cd '${remoteDir}' && tar -xf -`,
    ];
    const ssh = spawn("ssh", sshArgs, { stdio: ["pipe", "inherit", "inherit"] });

    let tarErr = "";
    tar.stderr?.on("data", (c) => {
      tarErr += c.toString();
    });

    tar.stdout.pipe(ssh.stdin);

    ssh.on("close", (code) => {
      if (code !== 0) reject(new Error(`ssh código ${code}`));
      else resolve();
    });
    ssh.on("error", reject);
    tar.on("error", (e) => reject(e));
    tar.on("close", (c) => {
      if (c !== 0 && c !== null) reject(new Error(`tar: ${tarErr || c}`));
    });
  });
}

async function main() {
  console.log(`\n>> Enviando dist/ → ${user}@${host}:${remotePath}\n`);
  try {
    await runTarPipe();
    console.log("\n>> OK — site atualizado nessa pasta. Testa em janela anónima.\n");
  } catch (e) {
    console.error("\n[Falha]", e.message);
    console.log(`\nTenta manualmente (PowerShell):\n  scp -r dist\\* ${user}@${host}:${remotePath}/\n`);
    process.exit(1);
  }
}

main();
