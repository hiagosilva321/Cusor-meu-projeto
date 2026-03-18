# Admin com e-mail fictício — sem abrir caixa de correio

Não precisas de aceder ao e-mail. Faz **uma** destas coisas (A ou B) e depois **C**.

## A) Confirmar o utilizador à mão (1 clique no Supabase)

1. **Authentication** → **Users** → clica em `admin@cacambaja.com`
2. Procura um botão tipo **Confirm user** / **Confirm email** / menu **⋯** → confirmar  
   (varia conforme a versão do dashboard — confirma sem enviar e-mail)

## B) Confirmar por SQL (não precisas de e-mail)

1. **SQL Editor** → **New query**
2. Cola (troca o e-mail se for outro):

```sql
UPDATE auth.users
SET
  email_confirmed_at = timezone('utc'::text, now()),
  updated_at = timezone('utc'::text, now())
WHERE lower(email) = lower('admin@cacambaja.com');
```

3. **Run**  
4. Volta a **Users** e verifica se **Confirmed at** já tem data.

## C) Para não voltar a precisar de confirmação

**Authentication** → **Providers** → **Email**:

- **Desliga** **“Confirm email”** (ou “Enable email confirmations” — o nome muda um pouco).

Assim podes criar admins com e-mails fictícios e entrar só com e-mail + senha, sem link na caixa de correio.

---

**Senha:** se não souberes a senha, no mesmo user usa **Reset password** (só funciona se o SMTP do projeto enviar e-mail) **ou**, no teu PC com `api/.env` e **service_role**:

```bash
node deploy/create-admin-user.mjs admin@cacambaja.com "TuaSenhaAqui"
```

Esse comando também marca o e-mail como confirmado ao atualizar o user.
