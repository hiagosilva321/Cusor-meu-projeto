# Deploy do site (passo a passo)

## Uma vez só — domínio + painel

1. **DNS:** `A` `@` e `www` → IP da VPS.
2. **aaPanel** → **Website** → **Add site**
   - Domínio: `pedircacamba.com` (e `www` como alias se der).
   - **Raiz:** `/var/www/pedircacamba/dist`
3. Nesse site → **Config** → **Nginx** → colar blocos de `deploy/aapanel-site.conf` (dentro do `server { }`). Ajustar **3000** se `PORT` em `api/.env` for outra.
4. **SSL** no aaPanel (Let’s Encrypt) para HTTPS.

---

## Na VPS — código + API + build (cada vez que atualizas)

**1.** Variáveis (se ainda não existirem):

- `/var/www/pedircacamba/.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `/var/www/pedircacamba/api/.env` → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FASTSOFT_SECRET_KEY`, `PORT=3000`

**2.** Script automático (na VPS, como root):

```bash
cd /var/www/pedircacamba
bash deploy/deploy-site.sh
```

Ou à mão:

```bash
cd /var/www/pedircacamba
git pull origin main
cd api && npm install --omit=dev && cd ..
pm2 restart cacambaja-api || pm2 start api/server.js --name cacambaja-api
npm install && npm run build
```

**3.** Abre **https://pedircacamba.com** (não uses o IP para ver o site — o IP é o painel).

---

## No teu PC — enviar alterações

```powershell
cd "C:\Users\alexm\Downloads\Meu Projeto (1)"
git add .
git commit -m "sua mensagem"
git push origin main
```

Depois na VPS: `bash deploy/deploy-site.sh` (ou os comandos acima).
