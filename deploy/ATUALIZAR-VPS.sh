#!/usr/bin/env bash
# Atualiza o site na VPS: git pull (HTTPS, repo público) + build + wwwroot + API PM2.
# Uso na VPS (root): bash /var/www/pedircacamba/deploy/ATUALIZAR-VPS.sh
# Git: origin em SSH (git@github.com:hiagosilva321/Cusor-meu-projeto.git) ou HTTPS se preferires.
set -euo pipefail

APP="${APP:-/var/www/pedircacamba}"
cd "$APP"

echo ">> Git: pull origin main"
git pull origin main

echo ">> Dependências + build (npm run deploy)"
npm ci 2>/dev/null || npm install
npm run deploy

echo ">> Publicar dist + env.js"
for SITE in /www/wwwroot/pedircacamba.com /www/wwwroot/checkout.pedircacamba.com; do
  if [[ -d "$SITE" ]]; then
    rsync -a --delete --exclude='.user.ini' "$APP/dist/" "$SITE/"
    if [[ -f "$APP/.env" ]]; then
      node "$APP/deploy/write-env-js.mjs" "$APP/.env" "$SITE/env.js"
    fi
    echo "   OK $SITE"
  fi
done

echo ">> API Node"
cd "$APP/api"
npm install --omit=dev
if pm2 describe cacambaja-api >/dev/null 2>&1; then
  pm2 restart cacambaja-api
else
  pm2 start "$APP/api/server.js" --name cacambaja-api
fi
pm2 save 2>/dev/null || true

echo ""
echo "OK. Teste: curl -s http://127.0.0.1:3000/api/health"
