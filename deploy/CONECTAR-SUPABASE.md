# Conectar o Supabase a este projeto

## 1. No Supabase (browser)

1. Abre o **projeto** que vais usar (ex.: Checkout).
2. **Settings** (engrenagem) → **API**.
3. Copia:
   - **Project URL** → algo como `https://abcdefgh.supabase.co`
   - **Legacy** → **anon public** → **Copy** (chave longa que começa com `eyJ`)

## 2. No Cursor — ficheiro `.env` (raiz do projeto)

Edita **`.env`** com **o mesmo projeto** nos dois sítios:

```env
VITE_SUPABASE_URL=https://O_TEU_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...cole_a_chave_anon_inteira
VITE_SUPABASE_PROJECT_ID=O_TEU_REF
```

`O_TEU_REF` = a parte do meio do URL (antes de `.supabase.co`).

Guarda o ficheiro.

## 3. Confirmar que está certo

No terminal, na pasta do projeto:

```bash
node deploy/check-supabase-env.mjs
```

Deve aparecer **✓ URL e chave anon são do MESMO projeto**.

## 4. Correr o site

```bash
npm run dev
```

Ou build para produção:

```bash
npm run deploy
```

## 5. Base de dados

Se o projeto for **novo** ou vazio, corre as migrations em **SQL Editor** (ver `deploy/NOVO-PROJETO-SUPABASE.md`).

## 6. API (Node) — opcional para checkout/PIX

Ficheiro **`api/.env`**:

```env
SUPABASE_URL=https://O_MESMO_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=chave_service_role_destE_projeto
```

---

O código já usa `src/integrations/supabase/client.ts` — não precisas alterar TypeScript, só o **`.env`**.
