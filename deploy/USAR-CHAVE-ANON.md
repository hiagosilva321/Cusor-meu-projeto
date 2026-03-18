# Corrigir "Chave API inválida" — usar anon (eyJ...)

## 1. No Supabase
- Projeto **liuocutpghreoputefav** (ou o teu)
- **Settings** → **API** ou **API Keys**
- Aba **Legacy API keys**
- **anon public** → **Copy** (chave **inteira**, uma linha, começa com **eyJ**)

## 2. No PC — ficheiro `.env` (raiz do projeto)
Substitui a linha da chave:

```env
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

(URL e PROJECT_ID mantêm-se iguais.)

## 3. Gerar env.js + build
```bash
npm run deploy
```

## 4. No servidor
- Copia o **novo** `dist/env.js` para a raiz do site (`pedircacamba.com`), **ou**
- Toda a pasta `dist/` outra vez.

## 5. Testar
Ctrl+F5 no site. O login / WhatsApp deve deixar de dar 401.

**Nunca** coloques **service_role** no `.env` da raiz — só **anon** no browser.
