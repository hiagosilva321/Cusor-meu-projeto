# Credenciais do painel admin

Conta prevista:

- **E-mail:** `admin@cacambja.com` (se quiseres `admin@cacambaja.com`, cria esse user no Supabase e altera o campo no login ou o default em `AdminLogin.tsx`.)
- **Senha:** a que definires no Supabase (ex.: `Admin123456`).

## Criar ou atualizar o user (service_role)

No PC, com `api/.env` contendo `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` do **mesmo** projeto do site:

```bash
node deploy/create-admin-user.mjs admin@cacambja.com "Admin123456"
```

No Supabase: **Authentication → Users → Add user** com esse e-mail e senha, **Auto confirm user** ativo.

## Se der 422 no login

**Authentication → Attack Protection:** desliga CAPTCHA/proteção no **sign-in** (o formulário não envia captcha).

## Confirmar e-mail fictício

Ver `deploy/ADMIN-SEM-CONFIRMACAO-EMAIL.md` (SQL ou desligar “Confirm email”).
