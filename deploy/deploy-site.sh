#!/usr/bin/env bash
# Deploy na VPS: pull + API + build. Correr: cd /var/www/pedircacamba && bash deploy/deploy-site.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ">> git pull"
git pull origin main

echo ">> API deps"
cd "$ROOT/api"
npm install --omit=dev
cd "$ROOT"

if pm2 describe cacambaja-api >/dev/null 2>&1; then
  echo ">> pm2 restart cacambaja-api"
  pm2 restart cacambaja-api
else
  echo ">> pm2 start (primeira vez — precisa de api/.env)"
  pm2 start "$ROOT/api/server.js" --name cacambaja-api
  pm2 save
fi

echo ">> front npm install + build"
cd "$ROOT"
if [[ ! -f .env ]]; then
  echo "AVISO: Cria .env na raiz com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY"
fi
npm install
npm run build

echo ">> OK — dist atualizado. Teste: ls dist/index.html"
ls -la "$ROOT/dist/index.html"
echo "No aaPanel: raiz = $ROOT/dist e Nginx com deploy/aapanel-site.conf"
