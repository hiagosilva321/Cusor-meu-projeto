import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Users, MousePointer, MessageCircle, Package, TrendingUp, Banknote, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ClickStat {
  number_id: string;
  number_label: string;
  number_value: string;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
}

/** PIX confirmado ou pedido com status "Pago" no admin — alinhado ao painel CEO. */
const PAID_ORDERS_FILTER = 'payment_status.eq.paid,status.eq.pago';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    leads: 0,
    clicks: 0,
    numbers: 0,
    sizes: 0,
    paidOrders: 0,
    revenuePaid: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [clickStats, setClickStats] = useState<ClickStat[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [
        leadsRes,
        clicksRes,
        numbersRes,
        sizesRes,
        recentRes,
        clickStatsRes,
        paidOrdersRes,
        paidTotalsRes,
      ] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('whatsapp_clicks').select('id', { count: 'exact', head: true }),
        supabase.from('whatsapp_numbers').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('dumpster_sizes').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.rpc('get_click_stats'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).or(PAID_ORDERS_FILTER),
        supabase.from('orders').select('valor_total').or(PAID_ORDERS_FILTER),
      ]);

      const revenuePaid = (paidTotalsRes.data || []).reduce(
        (acc, r: { valor_total: number | null }) => acc + (Number(r.valor_total) || 0),
        0,
      );

      setStats({
        leads: leadsRes.count || 0,
        clicks: clicksRes.count || 0,
        numbers: numbersRes.count || 0,
        sizes: sizesRes.count || 0,
        paidOrders: paidOrdersRes.count || 0,
        revenuePaid,
      });
      setRecentLeads(recentRes.data || []);
      setClickStats((clickStatsRes.data as ClickStat[]) || []);
    }
    fetchData();
  }, []);

  const brl = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const statCards = [
    { label: 'Faturamento (pagos)', value: brl(stats.revenuePaid), icon: Banknote, color: 'bg-whatsapp/10 text-whatsapp' },
    { label: 'Pedidos pagos', value: stats.paidOrders, icon: CheckCircle, color: 'bg-green-600/10 text-green-700' },
    { label: 'Total de Leads', value: stats.leads, icon: Users, color: 'bg-accent/10 text-accent' },
    { label: 'Cliques WhatsApp', value: stats.clicks, icon: MousePointer, color: 'bg-whatsapp/10 text-whatsapp' },
    { label: 'Números Ativos', value: stats.numbers, icon: MessageCircle, color: 'bg-primary/10 text-primary' },
    { label: 'Tamanhos Ativos', value: stats.sizes, icon: Package, color: 'bg-accent/10 text-accent' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl bg-card border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
              <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                <stat.icon size={20} />
              </div>
            </div>
            <span className="font-display text-3xl font-bold text-foreground tabular-nums">{stat.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Click chart */}
        <div className="rounded-xl bg-card border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-accent" />
            <h2 className="font-display text-lg font-bold text-foreground">Cliques por Número</h2>
          </div>
          {clickStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={clickStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="number_label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="total_clicks" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="clicks_today" fill="hsl(var(--whatsapp))" radius={[4, 4, 0, 0]} name="Hoje" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-12 text-center">Nenhum clique registrado ainda.</p>
          )}
        </div>

        {/* Click stats table */}
        <div className="rounded-xl bg-card border shadow-sm p-5">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Detalhes por Número</h2>
          <div className="space-y-3">
            {clickStats.length > 0 ? clickStats.map((cs) => (
              <div key={cs.number_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-semibold text-foreground">{cs.number_label}</p>
                  <p className="text-xs text-muted-foreground">{cs.number_value}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{cs.total_clicks} total</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{cs.clicks_today} hoje</span>
                    <span>{cs.clicks_week} semana</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados disponíveis.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent leads */}
      <div className="rounded-xl bg-card border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-display text-lg font-bold text-foreground">Últimos Pedidos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 text-sm font-semibold text-foreground">Nome</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Telefone</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Tamanho</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Data</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Nº WhatsApp</th>
                <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLeads.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lead recebido ainda.</td></tr>
              ) : (
                recentLeads.map((lead) => (
                  <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-4 text-sm font-medium text-foreground">{lead.nome}</td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.whatsapp}</td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.tamanho}</td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{lead.numero_atribuido || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        lead.status === 'Novo' ? 'bg-accent/20 text-accent-foreground' :
                        lead.status === 'Em atendimento' ? 'bg-whatsapp/20 text-whatsapp' :
                        'bg-muted text-muted-foreground'
                      }`}>{lead.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
