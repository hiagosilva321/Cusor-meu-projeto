# Diagnóstico: 422 no login, deploy “não muda”, feature_collector

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
