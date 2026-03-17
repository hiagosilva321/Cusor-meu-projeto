# Deploy Nginx na VPS

Eu **não consigo** entrar na tua VPS. Estes ficheiros aplicam a config certa **quando correres o script aí**.

## Na VPS (SSH como root)

```bash
cd /var/www/pedircacamba
git pull origin main
chmod +x deploy/apply-nginx.sh
bash deploy/apply-nginx.sh
```

O script:
- lê a porta em `api/.env` (`PORT=`) ou usa **3000**
- aponta o site para `dist/`
- remove outros sites em `sites-enabled` e ativa só o **pedircacamba**
- `nginx -t` + `reload`

## No PC (atualizar GitHub)

Depois de puxares as alterações: `git add deploy && git commit -m "deploy nginx script" && git push`
