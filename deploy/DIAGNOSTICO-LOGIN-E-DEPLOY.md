# Diagnóstico: 422 no login, deploy “não muda”, feature_collector

## 0. Arranque rápido — CAPTCHA / Turnstile (erro 422 no `/admin`)

O login envia o token do **Cloudflare Turnstile** para o Supabase. Três peças têm de bater:

1. **Site** (público): `VITE_TURNSTILE_SITE_KEY` no `.env` da raiz → `node deploy/write-env-js.mjs .env /caminho/do/site/env.js` (ou `npm run deploy`).
2. **Secret** (só no Supabase): **Authentication** → **Attack Protection** → Turnstile → mesma chave **Secret** do mesmo widget no painel Cloudflare.
3. No `/admin`, marcar a caixa Turnstile **antes** de “Entrar”.

**Chaves de teste Cloudflare** (úteis para desbloquear rápido; em produção forte use as suas no Cloudflare):

| Onde | Valor |
|------|--------|
| Site Key (`.env` / `env.js`) | `1x00000000000000000000AA` |
| Secret Key (só Supabase Attack Protection) | `1x0000000000000000000000000000000AA` |

Se no Supabase estiver uma **Secret** de produção diferente, o token do site não valida: ou coloque no `.env` a **Site Key** do **mesmo** widget cuja Secret está no Supabase, ou troque a Secret no Supabase para corresponder ao widget que o site usa.

**Sem CAPTCHA:** Supabase → Authentication → Attack Protection → desative proteção no **sign-in**.

### Automático (Management API — sem abrir o painel)

1. Crie um **Personal Access Token**: [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) (permissões que permitam alterar a configuração de Auth do projeto).
2. No servidor (ou PC), copie `deploy/supabase-management.example.env` → `deploy/supabase-management.env` e preencha `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` (o ref é o subdomínio do URL, ex. `liuocutpghreoputefav`).
3. Com o site já a usar a **Site Key de teste** `1x00000000000000000000AA`, alinhe o Supabase:

   ```bash
   npm run supabase:captcha-turnstile-test
   ```

   Ou desligue CAPTCHA por completo:

   ```bash
   npm run supabase:captcha-off
   ```

---

## 1. `feature_collector.js` — aviso amarelo

**Não é o teu site.** É extensão do Chrome (ex.: Cursor, Grammarly).  
**Ignora** ou testa em **janela anónima** sem extensões.

---

## 2. Erro **422** em `.../auth/v1/token`

O Supabase recusa o login. Causas mais comuns:

### A) CAPTCHA ligado no **sign-in** (muito comum)

O formulário antigo **não enviava token** → **422**.

**Opção mais simples:**  
**Supabase** → **Authentication** → **Attack Protection** (ou *Bot / Abuse Protection*) → **desliga** CAPTCHA / proteção no **login** (sign-in).

**Opção com CAPTCHA (recomendado se quiseres manter proteção):**

1. [Cloudflare Turnstile](https://dash.cloudflare.com/) → criar site → copiar **Site Key** (público) e **Secret Key**.
2. **Supabase** → **Authentication** → **Attack Protection** → provider **Turnstile** → colar **Secret Key**; ativar proteção no sign-in.
3. No projeto, no `.env` da **raiz**:

   ```env
   VITE_TURNSTILE_SITE_KEY=0x4AAAA...teu_site_key
   ```

4. `npm run deploy` (gera `dist/` + `env.js` com a chave) **ou** só:

   ```bash
   node deploy/write-env-js.mjs .env /caminho/wwwroot/env.js
   ```

   e copia também o **JS novo** do `dist/assets/` + `index.html` (o widget está no bundle).

5. No `/admin` aparece a caixa Turnstile; só depois **Entrar**.

### B) E-mail ou senha errados

Cria/atualiza user:

```bash
node deploy/create-admin-user.mjs admin@cacambja.com "Admin123456"
```

(`api/.env` com **service_role** válida.)

### C) E-mail não confirmado / provider Email desligado

Ver `deploy/ADMIN-SEM-CONFIRMACAO-EMAIL.md` e `deploy/AUTH-400-LOGIN.md`.

---

## 3. Deploy “não atualiza” o site

1. Na VPS, **sempre**:

   ```bash
   cd /var/www/pedircacamba
   git pull   # se usas git
   npm ci
   npm run deploy
   rsync -avz --delete dist/ /www/wwwroot/pedircacamba.com/
   ```

   (Ajusta o destino ao **root** real do Nginx.)

2. Confirma que o **index.html** no servidor mudou:

   ```bash
   grep cacamba-deploy-id /www/wwwroot/pedircacamba.com/index.html
   ```

3. **Cache:** janela anónima ou Ctrl+F5. Ideal: Nginx **sem cache longo** em `index.html` — ver `deploy/CACHE-SPA.md`.

4. Comando errado comum: `npmnode` → é **`node`**, não `npmnode`.

---

## 4. `Invalid API key` no `create-admin-user`

- Ficheiro: **`/var/www/pedircacamba/api/.env`**
- Variáveis: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (JWT com `"role":"service_role"` no [jwt.io](https://jwt.io), **não** anon).

---

## Checklist rápido

| Sintoma | Ação |
|--------|------|
| 422 | Desligar CAPTCHA no sign-in **ou** `VITE_TURNSTILE_SITE_KEY` + Turnstile no Supabase |
| feature_collector | Ignorar (extensão) |
| Site igual após deploy | `rsync` pasta certa + limpar cache + `index.html` novo |
| create-admin falha | `api/.env` + service_role correta |
