# Erro 401 / Invalid API key / WhatsApp init error

## O que significa

Todas as chamadas ao Supabase (login admin, WhatsApp, tabelas) enviam a **mesma chave pública** no header `apikey`.

Se a chave for **inválida** para o teu projeto, o servidor responde **401 Unauthorized** e mensagens como:

- `Invalid API key`
- Falha no WebSocket Realtime
- Falha em `GET .../rest/v1/whatsapp_numbers ... 401`

**Não é problema de senha do admin** — é a **chave do projeto** no `.env` / `env.js`.

## Solução que mais funciona (chave legada JWT)

1. Supabase Dashboard → **Project Settings** (engrenagem) → **API Keys** (ou **API**).
2. Abre o separador **Legacy API keys** (ou “anon / public”).
3. Copia a chave **`anon`** — começa por **`eyJhbGciOi...`** (muito longa, uma linha só).
4. No `.env` na raiz do projeto:

   ```env
   VITE_SUPABASE_URL=https://dfjujizzlncgrtsypszg.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...cole_a_chave_anon_completa
   ```

5. Gera de novo o `env.js` e faz deploy:

   ```bash
   npm run deploy
   ```

   Ou na VPS, após `git pull`, garante que o `.env` tem a chave **anon JWT** e corre `bash deploy/deploy-site.sh`.

## Chave `sb_publishable_...`

O Supabase também mostra chaves novas (`sb_publishable_...`). Em alguns casos dão 401 até estarem bem copiadas ou por versão do cliente.

- Confirma que **não há espaços** nem quebra de linha.
- Se continuar 401, **usa a chave anon JWT (legacy)** como acima — é equivalente para o browser.

## Nunca no browser

- **`sb_secret_...`** e **`service_role`** → 401 no browser (proposital). Só no servidor (`api/.env`).
