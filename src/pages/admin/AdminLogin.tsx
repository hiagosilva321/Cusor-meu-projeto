import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, User, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseClientConfigured } from '@/integrations/supabase/client';
import { mapSupabaseAuthError } from '@/lib/auth-errors';
import logoIcon from '@/assets/logo-icon.png';

const DEFAULT_ADMIN_EMAIL = 'admin@cacambja.com';

function turnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [tsKey, setTsKey] = useState('');
  const configured = isSupabaseClientConfigured();

  useEffect(() => {
    setTsKey(turnstileSiteKey());
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/admin/dashboard', { replace: true });
    });
  }, [navigate]);

  const resetCaptcha = useCallback(() => {
    setCaptchaToken(null);
    setTurnstileKey((k) => k + 1);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) {
      toast.error('Supabase não configurado (URL/chave). Verifique as variáveis do ambiente atual e o deploy na Vercel.');
      return;
    }
    const siteKey = turnstileSiteKey();
    if (siteKey && !captchaToken) {
      toast.error('Complete a verificação (caixa abaixo) antes de entrar.');
      return;
    }
    setLoading(true);
    try {
      const trimmed = email.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessão não gravou. Atualize a página e tente de novo.');
        return;
      }
      toast.success('Entrou no painel.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      const ex = err as { message?: string; status?: number };
      toast.error(mapSupabaseAuthError(ex.message || '', ex.status), { duration: 12000 });
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const shell = (
    <div className="fixed inset-0 z-[9999] flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-y-auto bg-primary px-4 py-10 sm:px-6 sm:py-12">
      <div className="w-full max-w-md shrink-0 rounded-2xl border border-primary-foreground/10 bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img src={logoIcon} alt="" className="mx-auto mb-4 h-14 w-14" />
          <h1 className="font-display text-2xl font-bold text-foreground">Painel administrativo</h1>
          <p className="text-muted-foreground mt-1 text-sm">Entre com e-mail e senha</p>
        </div>

        {!configured && (
          <p className="text-destructive mb-4 rounded-lg bg-destructive/10 p-3 text-sm">
            URL ou chave Supabase em falta no site.
          </p>
        )}

        {!tsKey && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <strong>Erro 422 no login?</strong> O Supabase pode exigir CAPTCHA. Faça <strong>uma</strong> destas: (1){' '}
            <strong>Desligar</strong> proteção no login: Authentication → <strong>Attack Protection</strong> → desative
            CAPTCHA no sign-in. (2) Ou crie Turnstile em Cloudflare, coloque o <strong>Site Key</strong> em{' '}
            <code className="rounded bg-black/10 px-1">VITE_TURNSTILE_SITE_KEY</code> no ambiente da Vercel e publique um novo deploy.
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <User className="text-muted-foreground absolute left-3 top-1/2 size-[18px] -translate-y-1/2" />
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10"
              autoComplete="email"
              required
            />
          </div>
          <div className="relative">
            <Lock className="text-muted-foreground absolute left-3 top-1/2 size-[18px] -translate-y-1/2" />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10"
              autoComplete="current-password"
              required
            />
          </div>

          {tsKey ? (
            <div className="flex justify-center overflow-x-auto py-1">
              <Turnstile
                key={turnstileKey}
                siteKey={tsKey}
                onSuccess={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
                options={{ theme: 'light', size: 'normal' } as const}
              />
            </div>
          ) : null}

          <Button type="submit" className="w-full" size="lg" disabled={loading || (!!tsKey && !captchaToken)}>
            {loading ? 'A entrar…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-muted-foreground mt-3 text-center text-[10px] leading-tight">
          <code>feature_collector.js</code> = extensão do browser, não é este site.
        </p>

        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground mt-2 w-full"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 size-4" />
          Voltar ao site
        </Button>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(shell, document.body) : shell;
}
