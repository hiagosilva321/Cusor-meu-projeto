/** Mensagens em português para erros comuns do login Supabase */
export function mapSupabaseAuthError(message: string): string {
  const m = (message || '').toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos. No Supabase: Authentication → Users — confira se o usuário existe e a senha.';
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
  return message || 'Não foi possível entrar. Tente de novo.';
}
