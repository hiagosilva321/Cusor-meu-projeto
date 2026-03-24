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
import { cn } from '@/lib/utils';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';

const DEFAULT_ADMIN_EMAIL = 'admin@cacambja.com';

function turnstileSiteKey(): string {
  if (typeof window !== 'undefined') {
    const t = window.__CACAMBAJA_ENV__?.turnstileSiteKey?.trim();
    if (t) return t;
  }
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() || '';
}

export default function AdminLogin() {
  const { theme } = useAdminTheme();
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
      toast.error('Supabase não configurado (URL/chave). Verifique .env ou env.js e deploy.');
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
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-y-auto bg-primary px-4 py-10 sm:px-6 sm:py-12',
        theme === 'dark' && 'dark',
      )}
    >
      <div className="absolute right-3 top-3 sm:right-5 sm:top-5">
        <AdminThemeToggle className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
      </div>
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
          <p className="text-muted-foreground mb-4 rounded-lg border border-border bg-muted/40 p-3 text-left text-xs leading-relaxed">
            <strong className="text-foreground">Sem chave Turnstile no site.</strong> Se o login der 422, no Supabase desative CAPTCHA no sign-in
            (Authentication → Attack Protection) ou defina <code className="rounded bg-muted px-1">VITE_TURNSTILE_SITE_KEY</code> no{' '}
            <code className="rounded bg-muted px-1">.env</code>, regenere <code className="rounded bg-muted px-1">env.js</code> e faça deploy.{' '}
            <span className="text-muted-foreground">Guia no repositório: </span>
            <code className="rounded bg-muted px-1">deploy/DIAGNOSTICO-LOGIN-E-DEPLOY.md</code>
          </p>
        )}

        {tsKey ? (
          <p className="text-muted-foreground mb-3 text-center text-xs leading-relaxed">
            Complete a verificação abaixo antes de entrar. Se continuar a falhar, confira se a <strong className="text-foreground">Secret Key</strong> do
            Turnstile no Supabase (Attack Protection) corresponde à mesma chave do widget no Cloudflare.
          </p>
        ) : null}

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
                options={{ theme: theme === 'dark' ? 'dark' : 'light', size: 'normal' } as const}
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
