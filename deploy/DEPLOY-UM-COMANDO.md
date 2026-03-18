# Deploy num comando (pasta certa na VPS)

## 1) Uma vez no teu PC

1. Copia o ficheiro:
   - `deploy/deploy-target.example.env` → `deploy/deploy-target.env`
2. Edita `deploy/deploy-target.env`:

```env
DEPLOY_HOST=123.45.67.89
DEPLOY_USER=root
DEPLOY_PATH=/www/wwwroot/pedircacamba.com
```

O **`DEPLOY_PATH`** tem de ser **exactamente** a raiz do site no aaPanel (onde estão `index.html`, pasta `assets/`, `env.js`).

3. Garante que consegues entrar por SSH sem password (chave) ou com password quando correres o comando.

## 2) Sempre que quiseres publicar

Na pasta do projeto (no Windows, PowerShell):

```bash
npm run deploy:vps
```

Isto faz: **build** + **env.js** + **envia tudo em `dist/`** para `DEPLOY_PATH` na VPS.

## 3) Se der erro de SSH

- Instala / ativa **OpenSSH Client** (Windows: Definições → Apps → Funcionalidades opcionais).
- Ou usa a linha que o script mostra com `scp` manual.

## 4) aaPanel

A **raiz do site** no painel tem de ser a mesma pasta que `DEPLOY_PATH` (normalmente já está).
