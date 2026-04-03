# Fazenda / CaçambaJá

Operação interna enxuta para captação de pedidos de caçamba, geração de PIX e gestão administrativa.

## Stack ativa

- Frontend: React + Vite + TypeScript
- Backend canônico: Supabase Edge Functions
- Banco/Auth: Supabase
- Deploy do frontend: GitHub + Vercel

## Ambiente

Use `.env.example` como base local:

```bash
npm install
npm run dev
```

Variáveis obrigatórias:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Opcional:

- `VITE_TURNSTILE_SITE_KEY`

## Validação

```bash
npm run ci:check
```

## Superfícies canônicas

- `supabase/functions/create-pix-charge`
- `supabase/functions/get-order-status`
- `supabase/functions/fastsoft-webhook`
- `docs/00-governance/*`
- `PRD-Style/*`
