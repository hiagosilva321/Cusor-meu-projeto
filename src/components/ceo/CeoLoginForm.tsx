import { useEffect, useState, type FormEvent } from 'react';
import { apiFetchJson } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { cn } from '@/lib/utils';
import logoIcon from '@/assets/logo-icon.png';

type CeoAuthOptions = {
  loginRequired: boolean;
  clientCodeRequired?: boolean;
  defaultClientCode?: string;
};

export function CeoLoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { theme } = useAdminTheme();
  const [loginRequired, setLoginRequired] = useState(false);
  const [clientCodeRequired, setClientCodeRequired] = useState(true);
  const [defaultClientCode, setDefaultClientCode] = useState('PEDIR');
  const [login, setLogin] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const o = await apiFetchJson<CeoAuthOptions>('ceo-auth/options', { method: 'GET' });
        if (!cancelled) {
          setLoginRequired(Boolean(o.loginRequired));
          setClientCodeRequired(o.clientCodeRequired !== false);
          const def = (o.defaultClientCode || 'PEDIR').trim().toUpperCase();
          setDefaultClientCode(def);
          setClientCode((c) => (c ? c : def));
        }
      } catch {
        if (!cancelled) setLoginRequired(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const code = (clientCode || defaultClientCode).trim().toUpperCase();
      if (clientCodeRequired && !code) {
        setError('Indique o código do projeto (cliente).');
        setSubmitting(false);
        return;
      }
      await apiFetchJson('ceo-auth/login', {
        method: 'POST',
        body: JSON.stringify({
          ...(loginRequired ? { login: login.trim() } : {}),
          ...(clientCodeRequired ? { clientCode: code } : {}),
          password: password.trim(),
        }),
      });
      setPassword('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={cn(
        'min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-muted',
        theme === 'dark' && 'dark',
      )}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <img src={logoIcon} alt="" className="h-10 w-10" />
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Painel CEO</h1>
            <p className="text-xs text-muted-foreground">Acesso reservado — /hashadmin1</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {clientCodeRequired && (
            <div className="space-y-2">
              <Label htmlFor="ceo-client-code">Código do projeto</Label>
              <Input
                id="ceo-client-code"
                type="text"
                autoComplete="organization"
                placeholder={defaultClientCode}
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value.toUpperCase())}
                disabled={submitting}
              />
              <p className="text-[11px] text-muted-foreground">
                Ex.: PEDIR para Pedir Caçamba — outro cliente usa o código que lhe foi atribuído.
              </p>
            </div>
          )}
          {loginRequired && (
            <div className="space-y-2">
              <Label htmlFor="ceo-login">Utilizador</Label>
              <Input
                id="ceo-login"
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ceo-password">Senha</Label>
            <Input
              id="ceo-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'A entrar…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
