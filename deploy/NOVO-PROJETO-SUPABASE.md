# Novo projeto Supabase — passo a passo completo

Use isto quando criares um **projeto novo** no Supabase (base vazia + URL/chaves novas).

---

## 1. Criar o projeto no Supabase

1. [supabase.com](https://supabase.com) → **+ New project**
2. Escolhe **organização**, **nome** (ex.: CaçambaJá), **password** da base (guarda num sítio seguro)
3. **Região** (ex.: São Paulo se existir, senão a mais próxima)
4. Aguarda ficar **ACTIVE**

---

## 2. Anotar chaves (Settings → API)

No projeto novo:

| O quê | Onde copiar |
|--------|-------------|
| **Project URL** | `https://XXXX.supabase.co` |
| **anon** (Legacy) ou **Publishable** | Front — `.env` |
| **service_role** (Legacy) ou **Secret** | Só servidor — `api/.env` |

⚠️ **service_role / secret** nunca no browser nem no Git.

---

## 3. Criar tabelas e políticas (SQL)

1. Supabase → **SQL Editor** → **New query**
2. Corre os ficheiros **por ordem** (data no nome), **um de cada vez** ou cola tudo na ordem:

Ordem sugerida (pasta `supabase/migrations/`):

1. `20260309152658_aa4d28c1-....sql` — base (whatsapp, sizes, leads, etc.)
2. `20260309152852_53edbc18-....sql` — site_settings + políticas admin
3. `20260309153609_b63ccfb9-....sql`
4. `20260309163319_90c8a56b-....sql`
5. `20260314105509_3b8aee8e-....sql`
6. `20260314121242_5fac84e4-....sql`
7. `20260314135453_f882f607-....sql`
8. `20260314203207_b60403df-....sql`
9. `20260317120000_site_offers.sql` — ofertas

Se algum der erro **“already exists”**, nesse ficheiro podes ignorar ou comentar só a parte duplicada.

Alternativa: se tiveres um `migration.sql` único na raiz do repo que junte tudo, podes usar **uma vez** em base vazia.

---

## 4. Utilizador admin (login `/admin`)

**Opção A — Painel**

1. **Authentication** → **Users** → **Add user**
2. Email + password → marca **Auto Confirm User** → criar

**Opção B — API** (só se **não existir** nenhum user ainda)

```bash
curl -X POST https://TEU_DOMINIO/api/create-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@teudominio.com","password":"SenhaForte123"}'
```

---

## 5. Ficheiro `.env` na **raiz** do projeto (front / build)

```env
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi..._anon_ou_publishable_
VITE_SUPABASE_PROJECT_ID=XXXX
```

(`PROJECT_ID` = parte do URL antes de `.supabase.co`)

---

## 6. Ficheiro `api/.env` (Node / PIX / pedidos)

```env
SUPABASE_URL=https://XXXX.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_..._ou_service_role_JWT
FASTSOFT_SECRET_KEY=chave_fastsoft
PORT=3000
```

Ajusta **PORT** ao que o Nginx aponta (muitas vezes **3000**).

---

## 7. Gerar site e env.js (PC)

```powershell
cd "pasta-do-projeto"
npm install
npm run deploy
```

Isto gera `dist/` + `dist/env.js`.

---

## 8. Servidor (VPS)

1. Cola o **mesmo** `.env` da raiz na VPS (pasta do clone) **ou** sobe `dist/` + `env.js`
2. Atualiza **`api/.env`** na VPS
3. Na VPS:

```bash
cd /var/www/pedircacamba   # teu caminho
git pull   # se usas git
cd api && npm install --omit=dev && cd ..
pm2 restart cacambaja-api
npm install && npm run build
```

Confirma que **`env.js`** na raiz do site público está atualizado.

---

## 9. Checklist final

- [ ] SQL das migrations correu sem erros críticos
- [ ] User admin criado (Auth)
- [ ] `.env` raiz com URL + anon/publishable corretos **deste** projeto
- [ ] `api/.env` com URL + **service_role/secret** **deste** projeto
- [ ] `npm run deploy` (PC) e ficheiros no servidor
- [ ] Site abre, WhatsApp/carrega dados, login `/admin` funciona
- [ ] Teste checkout/PIX se usares FastSoft

---

## O que **não** precisas mudar no código

Pastas `src/`, rotas e lógica — só **variáveis de ambiente** e **base nova** com as migrations.

Se algo falhar, anota a mensagem de erro (SQL ou browser) e o passo onde parou.
