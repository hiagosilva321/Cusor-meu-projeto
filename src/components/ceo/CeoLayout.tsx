import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PanelRight,
  LogOut,
  ChevronLeft,
  KeyRound,
  Building2,
  RefreshCw,
} from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';
import { useAdminTheme } from '@/contexts/AdminThemeContext';
import { AdminThemeToggle } from '@/components/admin/AdminThemeToggle';
import { cn } from '@/lib/utils';
import { apiFetchJson } from '@/lib/api';
import { CeoLoginForm } from '@/components/ceo/CeoLoginForm';

export const CEO_BASE = '/hashadmin1';
export const CEO_ACCESS_PATH = `${CEO_BASE}/acesso`;

const ceoMenuItems = [
  { label: 'Visão CEO (estratégia)', icon: LayoutDashboard, path: CEO_BASE },
  { label: 'Acesso e senha', icon: KeyRound, path: CEO_ACCESS_PATH },
  { label: 'Ir ao admin (operação)', icon: PanelRight, path: '/admin/dashboard' },
];

export function CeoLayout({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useAdminTheme();
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [ceoClient, setCeoClient] = useState<{
    name: string;
    code: string;
    slug?: string;
  } | null>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const s = await apiFetchJson<{
        ok: boolean;
        client?: { name: string; code: string; slug?: string };
      }>('ceo-auth/status', { method: 'GET' });
      setAuthenticated(Boolean(s.ok));
      setCeoClient(
        s.ok && s.client
          ? { name: s.client.name, code: s.client.code, slug: s.client.slug }
          : null,
      );
    } catch {
      setAuthenticated(false);
      setCeoClient(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await apiFetchJson<{
          ok: boolean;
          client?: { name: string; code: string; slug?: string };
        }>('ceo-auth/status', { method: 'GET' });
        if (!cancelled) {
          setAuthenticated(Boolean(s.ok));
          setCeoClient(
            s.ok && s.client
              ? { name: s.client.name, code: s.client.code, slug: s.client.slug }
              : null,
          );
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setCeoClient(null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiFetchJson('ceo-auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {
      /* sessão já inválida */
    }
    setAuthenticated(false);
    setCeoClient(null);
  };

  /** Termina a sessão deste cliente para poder entrar com outro código (multi-tenant). */
  const handleSwitchClient = () => {
    void handleLogout();
  };

  const isActive = (path: string) => {
    if (path === CEO_BASE) {
      return location.pathname === CEO_BASE || location.pathname === `${CEO_BASE}/`;
    }
    if (path === CEO_ACCESS_PATH) {
      return location.pathname === CEO_ACCESS_PATH;
    }
    if (path === '/admin/dashboard') {
      return location.pathname.startsWith('/admin/') && location.pathname !== '/admin';
    }
    return location.pathname === path;
  };

  if (checking) {
    return (
      <div
        className={cn(
          'min-h-screen flex items-center justify-center bg-muted',
          theme === 'dark' && 'dark',
        )}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <CeoLoginForm
        onSuccess={() => {
          void refreshAuth();
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        'ceo-shell flex min-h-[100dvh] w-full max-w-full flex-1 bg-muted',
        theme === 'dark' && 'dark',
      )}
    >
      <aside className="relative z-[1] hidden w-[17rem] shrink-0 flex-col border-r border-primary/20 bg-primary shadow-sm md:flex md:flex-col min-h-0">
        <div className="px-5 pt-6 pb-3 flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="" className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-primary-foreground">Painel CEO</span>
          </div>
          <p className="text-[11px] text-primary-foreground/60 leading-snug pl-11 -mt-0.5">
            Área CEO · não é o painel operativo (/admin)
          </p>
        </div>

        {ceoClient && (
          <div className="px-4 pb-3">
            <div className="rounded-xl border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-3 shadow-inner">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground/55">
                <Building2 size={14} className="shrink-0 opacity-90" aria-hidden />
                Cliente / projeto
              </div>
              <p className="mt-2 font-display text-sm font-semibold text-primary-foreground leading-tight break-words">
                {ceoClient.name}
              </p>
              <p className="mt-1 font-mono text-xs text-primary-foreground/80">
                Código: <span className="text-accent">{ceoClient.code}</span>
              </p>
              {ceoClient.slug ? (
                <p className="mt-0.5 text-[10px] text-primary-foreground/45 truncate" title={ceoClient.slug}>
                  {ceoClient.slug}
                </p>
              ) : null}
              <p className="mt-2 text-[10px] text-primary-foreground/50 leading-snug border-t border-primary-foreground/10 pt-2">
                Métricas e sessão são só deste cliente.
              </p>
              <button
                type="button"
                onClick={handleSwitchClient}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-primary-foreground/25 bg-primary/30 px-2 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              >
                <RefreshCw size={14} />
                Entrar com outro cliente
              </button>
            </div>
          </div>
        )}

        <div className="px-5 pb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-foreground/40 pl-1">
            Navegação
          </p>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-1">
          {ceoMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left leading-snug transition-colors min-w-0 ${
                  active
                    ? 'bg-sidebar-accent text-accent'
                    : 'text-primary-foreground/80 hover:text-primary-foreground hover:bg-sidebar-accent/50'
                }`}
              >
                <item.icon size={20} className="shrink-0 mt-0.5" />
                <span className="min-w-0 break-words">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 pb-4 pt-2 space-y-1 border-t border-primary-foreground/10">
          <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-primary-foreground/80 min-h-10">
            <span className="text-xs font-medium leading-none truncate min-w-0">Tema</span>
            <AdminThemeToggle className="h-9 w-9 shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft size={20} />
            Ver site público
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      <main className="relative z-0 flex min-h-[100dvh] min-w-0 flex-1 flex-col bg-muted overflow-x-auto">
        <div className="sticky top-0 z-20 md:hidden bg-primary shadow-sm">
          <header className="p-4 flex items-center justify-between gap-3 min-h-[3.25rem]">
            <span className="font-display text-lg font-bold text-primary-foreground min-w-0 flex-1 truncate pr-1 leading-tight">
              Painel CEO
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <AdminThemeToggle className="h-9 w-9 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" />
              <button
                type="button"
                onClick={handleLogout}
                className="text-primary-foreground/70 p-2 shrink-0 rounded-md hover:bg-primary-foreground/10"
              >
                <LogOut size={20} />
              </button>
            </div>
          </header>

          {ceoClient && (
            <div className="px-3 pb-2 border-b border-primary-foreground/10">
              <div className="flex items-center gap-2 rounded-lg border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-2">
                <Building2 size={16} className="text-primary-foreground/70 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-primary-foreground/50 font-semibold">
                    Cliente
                  </p>
                  <p className="text-xs font-semibold text-primary-foreground truncate">{ceoClient.name}</p>
                  <p className="text-[10px] font-mono text-accent">{ceoClient.code}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchClient}
                  className="shrink-0 rounded-md p-2 text-primary-foreground/80 hover:bg-primary-foreground/10"
                  title="Outro cliente"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>
          )}

          <nav className="flex overflow-x-auto border-t border-primary-foreground/10 px-2">
            {ceoMenuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 px-4 py-3 text-xs whitespace-nowrap shrink-0 ${
                    active ? 'text-accent border-b-2 border-accent' : 'text-primary-foreground/75'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1 p-6 md:p-8 min-w-0 max-w-full">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-x-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground min-w-0 break-words [overflow-wrap:anywhere] pr-0 md:pr-2">
              {title}
            </h1>
            <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-sm shrink-0 justify-self-end w-fit max-w-full">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Tema</span>
              <AdminThemeToggle className="h-9 w-9 text-foreground hover:bg-muted shrink-0" />
            </div>
          </div>
          <div className="min-w-0 max-w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}
