import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ADMIN_CATALOGO_PATH,
  ADMIN_CONFIGURACOES_PATH,
  ADMIN_DASHBOARD_PATH,
  ADMIN_LOGIN_PATH,
  ADMIN_PEDIDOS_PATH,
  ADMIN_WHATSAPP_PATH,
} from '@/lib/admin-surface';
import { isCurrentUserAdmin } from '@/lib/admin-auth';
import { useAdminSurfaceMeta } from '@/hooks/use-admin-surface-meta';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  MessageCircle,
  Settings,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';

const menuItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ADMIN_DASHBOARD_PATH },
  { label: 'Pedidos', icon: ShoppingCart, path: ADMIN_PEDIDOS_PATH },
  { label: 'Catálogo', icon: Package, path: ADMIN_CATALOGO_PATH },
  { label: 'WhatsApp', icon: MessageCircle, path: ADMIN_WHATSAPP_PATH },
  { label: 'Configurações', icon: Settings, path: ADMIN_CONFIGURACOES_PATH },
];

export function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  useAdminSurfaceMeta();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveSession(): Promise<boolean> {
      for (let i = 0; i < 4; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return true;
        if (i < 3) await new Promise((r) => setTimeout(r, 200));
      }
      return false;
    }

    (async () => {
      const ok = await resolveSession();
      if (cancelled) return;
      if (!ok) {
        navigate(ADMIN_LOGIN_PATH, { replace: true });
        return;
      }

      const isAdmin = await isCurrentUserAdmin();
      if (cancelled) return;

      if (!isAdmin) {
        await supabase.auth.signOut();
        navigate('/', { replace: true });
        return;
      }

      setChecking(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') navigate(ADMIN_LOGIN_PATH, { replace: true });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(ADMIN_LOGIN_PATH);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-[100dvh] w-full max-w-full flex-1 overflow-x-hidden bg-muted">
      {/* Sidebar */}
      <aside className="relative z-[1] hidden w-60 shrink-0 flex-col bg-primary shadow-[1px_0_0_0_hsl(var(--primary))] md:flex md:flex-col">
        <div className="p-5 flex items-center gap-3">
          <img src={logoIcon} alt="Logo" className="h-8 w-8" />
          <span className="font-display text-lg font-bold text-primary-foreground">
            Caçamba<span className="text-accent">Já</span>
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-1" aria-label="Navegação admin">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-accent ${
                  active
                    ? 'bg-accent/15 text-accent shadow-sm'
                    : 'text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/5'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 space-y-1">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-primary-foreground/40 hover:text-primary-foreground transition-colors"
          >
            <ChevronLeft size={18} />
            Ver Site
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main id="main-content" className="relative z-0 flex min-h-[100dvh] min-w-0 flex-1 flex-col bg-muted">
        {/* Mobile header */}
        <header className="md:hidden bg-primary p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Logo" className="h-6 w-6" />
            <span className="font-display text-base font-bold text-primary-foreground">
              Caçamba<span className="text-accent">Já</span>
            </span>
          </div>
          <button onClick={handleLogout} className="text-primary-foreground/70" aria-label="Sair">
            <LogOut size={20} />
          </button>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto bg-primary/95 border-b border-primary-foreground/10 px-2" aria-label="Navegação mobile">
          {menuItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-5 py-3 text-xs whitespace-nowrap shrink-0 transition-colors ${
                  active ? 'text-accent border-b-2 border-accent' : 'text-primary-foreground/60'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 p-5 md:p-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
