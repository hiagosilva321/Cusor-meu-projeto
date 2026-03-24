/** Mensagens em português para erros comuns do login Supabase */
export function mapSupabaseAuthError(message: string, httpStatus?: number): string {
  if (httpStatus === 422) {
    return (
      'Login recusado (422). Confirme e-mail e senha. Se o Supabase exige CAPTCHA no sign-in: marque a verificação (Turnstile) nesta página antes de Entrar; ' +
      'no Supabase → Authentication → Attack Protection, a Secret Key do Turnstile tem de corresponder à Site Key do site (mesmo widget no Cloudflare). ' +
      'Alternativa: desative CAPTCHA no sign-in nesse mesmo ecrã. Guia: deploy/DIAGNOSTICO-LOGIN-E-DEPLOY.md'
    );
  }
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials') || m.includes('invalid_grant')) {
    return 'E-mail ou senha incorretos — ou o utilizador não existe neste projeto Supabase. Crie o user em Authentication → Users ou redefina a senha.';
  }
  if (m.includes('signup') && m.includes('disabled')) {
    return 'Login por email desligado. Authentication → Providers → Email → ative.';
  }
  if (m.includes('email not confirmed')) {
    return 'Confirme o e-mail do usuário no Supabase (Users → confirme manualmente ou desative “Confirm email” em Auth).';
  }
  if (m.includes('fetch') || m.includes('network') || m.includes('failed to fetch')) {
    return 'Não foi possível conectar ao Supabase. Verifique VITE_SUPABASE_URL / env.js no site e o firewall.';
  }
  if (m.includes('invalid api key') || m.includes('jwt') || m.includes('apikey')) {
    return 'Chave inválida: Supabase → API → Legacy → copie "anon public" (eyJ...). Cole em .env como VITE_SUPABASE_PUBLISHABLE_KEY → npm run deploy → suba env.js. Guia: deploy/USAR-CHAVE-ANON.md';
  }
  if (m.includes('400') || m.includes('bad request')) {
    return 'Erro 400 no login. Supabase → Providers → Email (ativado). Users → criar user neste projeto. Ou senha errada — redefina em Users.';
  }
  if (m.includes('same') && m.includes('password')) {
    return 'A nova senha tem de ser diferente da atual.';
  }
  if (m.includes('already been registered') || m.includes('already registered')) {
    return 'Este e-mail já está registado noutra conta.';
  }
  if (m.includes('email rate limit')) {
    return 'Muitas alterações de e-mail. Tente mais tarde.';
  }
  return message || 'Não foi possível entrar. Tente de novo.';
}
