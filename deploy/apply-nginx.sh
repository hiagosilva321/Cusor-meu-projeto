#!/usr/bin/env bash
# Executar na VPS como root, dentro do projeto:
#   cd /var/www/pedircacamba && bash deploy/apply-nginx.sh
set -euo pipefail

APP_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NGINX_AVAILABLE="/etc/nginx/sites-available/pedircacamba"
NGINX_ENABLED="/etc/nginx/sites-enabled"

# Porta da API (api/.env ou 3000)
API_PORT=3000
if [[ -f "$APP_ROOT/api/.env" ]]; then
  P=$(grep -E '^[[:space:]]*PORT=' "$APP_ROOT/api/.env" | head -1 | cut -d= -f2 | tr -d ' \r"'"'" || true)
  [[ -n "${P:-}" ]] && API_PORT="$P"
fi

if [[ ! -d "$APP_ROOT/dist" ]] || [[ ! -f "$APP_ROOT/dist/index.html" ]]; then
  echo "ERRO: $APP_ROOT/dist/index.html não existe. Corre na raiz: npm install && npm run build"
  exit 1
fi

sed "s|__API_PORT__|${API_PORT}|g" "$APP_ROOT/deploy/nginx-site.conf" > /tmp/pedircacamba-nginx.conf

# Ajustar root se o projeto não estiver em /var/www/pedircacamba
if [[ "$APP_ROOT" != "/var/www/pedircacamba" ]]; then
  sed -i "s|/var/www/pedircacamba/dist|${APP_ROOT}/dist|g" /tmp/pedircacamba-nginx.conf
fi

install -m 644 /tmp/pedircacamba-nginx.conf "$NGINX_AVAILABLE"
rm -f "$NGINX_ENABLED"/*
ln -sf "$NGINX_AVAILABLE" "$NGINX_ENABLED/pedircacamba"

nginx -t
systemctl reload nginx

echo "OK — Nginx recarregado. API na porta ${API_PORT}."
echo "Teste: curl -s http://127.0.0.1/ | head -3"
