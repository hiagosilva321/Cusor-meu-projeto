# Login admin na página `/admin`

Formulário em `AdminLogin.tsx` (e-mail + senha → Supabase Auth). Credenciais: ver `deploy/ADMIN-LOGIN-CREDENCIAIS.md`.

---

# POST …/auth/v1/token 400 (Bad Request) no login admin

A chave Supabase já está OK (senão seria 401). O **400** no login com email/senha costuma ser:

## 1. Provider Email desligado
**Authentication** → **Providers** → **Email**  
- Ligar **Enable Email provider**  
- Permitir **sign in** com email + password  

## 2. Utilizador noutro projeto
O `admin@...` tem de existir no **mesmo** projeto cujo URL está no `env.js` (ex.: `liuocutpghreoputefav`).

## 3. Senha errada
**Users** → utilizador → **Reset password** ou apagar e **Add user** de novo com senha conhecida.

## 4. “Confirm email” / e-mail fictício
Não precisas de abrir o e-mail: guia completo **`deploy/ADMIN-SEM-CONFIRMACAO-EMAIL.md`** (SQL para marcar confirmado + desligar confirmação no provider).

## 5. Erro 422 no `/auth/v1/token`
Muito comum: **CAPTCHA / Bot protection** ligado no **sign-in** sem widget no site → desliga em **Authentication → Attack Protection** (proteção no login). Ou **senha errada** — `node deploy/create-admin-user.mjs email "senha"` com **service_role** no `api/.env`.

## 6. Ver o erro exato
No browser → **F12** → **Network** → pedido **token** → **Response** → `error_description` / `msg`.

## Aviso `feature_collector.js`
É de **extensão do browser** (ex.: Cursor), não do site — podes ignorar.
