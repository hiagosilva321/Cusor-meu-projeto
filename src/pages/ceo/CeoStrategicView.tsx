import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetchJson } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Banknote,
  MousePointer,
  Users,
  ShoppingCart,
  Clock,
  ArrowRight,
  LayoutDashboard,
  Settings,
} from 'lucide-react';

type CeoDashboard = {
  paidCount: number;
  pendingPayCount: number;
  revenueTotal: number;
  leadsCount: number;
  clicksCount: number;
};

export default function CeoStrategicView() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paidCount, setPaidCount] = useState(0);
  const [pendingPayCount, setPendingPayCount] = useState(0);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [clicksCount, setClicksCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await apiFetchJson<CeoDashboard>('ceo-dashboard', { method: 'GET' });
      setPaidCount(d.paidCount);
      setPendingPayCount(d.pendingPayCount);
      setRevenueTotal(d.revenueTotal);
      setLeadsCount(d.leadsCount);
      setClicksCount(d.clicksCount);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Não foi possível carregar os indicadores.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const brl = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const shortcuts = [
    { label: 'Dashboard operacional', to: '/admin/dashboard', desc: 'Resumo diário e gráficos', icon: LayoutDashboard },
    { label: 'Pedidos PIX', to: '/admin/orders', desc: 'Todos os pedidos e estados de pagamento', icon: ShoppingCart },
    { label: 'Leads / contactos', to: '/admin/leads', desc: 'Formulário e fila de contacto', icon: Users },
    { label: 'Configurações', to: '/admin/settings', desc: 'Dados da empresa e conta', icon: Settings },
  ];

  if (loading) {
    return <p className="text-muted-foreground">A carregar indicadores…</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        <p className="text-destructive font-medium">{loadError}</p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => void load()}>
          Tentar outra vez
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 rounded-lg border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-foreground max-w-3xl">
        <p className="font-semibold text-foreground mb-1">Isto não é o painel operacional</p>
        <p className="text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Admin (`/admin`)</strong> = trabalho do dia a dia: pedidos PIX, leads,
          ofertas, WhatsApp, configurações. <strong className="text-foreground">CEO (`/hashadmin1`)</strong> = só números e
          leitura para decisão; atalhos abaixo levam ao admin quando precisar de agir.
        </p>
      </div>
      <p className="text-muted-foreground mb-2 max-w-2xl text-sm">
        Indicadores: faturamento, conversões, fila de pagamento e contactos.
      </p>
      <p className="text-xs text-muted-foreground/80 mb-6 font-mono">
        URL reservada: <span className="text-foreground">/hashadmin1</span> (favoritos; não está no menu do admin).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-10">
        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Faturamento (PIX / pagos)</span>
            <Banknote size={20} className="text-accent shrink-0" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{brl(revenueTotal)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Soma dos pedidos com PIX confirmado ou marcados como <strong className="text-foreground">Pago</strong> no admin
          </p>
        </div>

        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Pagamentos confirmados</span>
            <Banknote size={20} className="text-whatsapp shrink-0" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{paidCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Inclui PIX pago e pedidos com status Pago</p>
        </div>

        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Aguardando pagamento</span>
            <Clock size={20} className="text-amber-600 shrink-0" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{pendingPayCount}</p>
          <p className="text-xs text-muted-foreground mt-1">PIX pendente e ainda não marcados como Pago</p>
        </div>

        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Leads (contactos)</span>
            <Users size={20} className="text-primary shrink-0" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{leadsCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Entradas pelo formulário / fila de contacto</p>
        </div>

        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground font-medium">Cliques WhatsApp</span>
            <MousePointer size={20} className="text-whatsapp shrink-0" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">{clicksCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Total de cliques rastreados no site</p>
        </div>
      </div>

      <div className="rounded-xl bg-card border shadow-sm p-5">
        <h2 className="font-display text-lg font-bold text-foreground mb-1">Atalhos para o admin (operação)</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Estes links abrem o <strong className="text-foreground">painel operacional</strong> em <code className="text-xs">/admin/…</code> — não é a área CEO.
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shortcuts.map((s) => (
            <li key={s.to}>
              <Button variant="outline" className="w-full h-auto py-3 px-4 justify-between gap-3" asChild>
                <Link to={s.to}>
                  <span className="flex flex-col items-start text-left min-w-0">
                    <span className="font-medium text-foreground flex items-center gap-2">
                      <s.icon size={16} className="shrink-0 opacity-70" />
                      {s.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal mt-0.5">{s.desc}</span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-muted-foreground" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
