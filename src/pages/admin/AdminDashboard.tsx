import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Order = Tables<'orders'>;

interface ClickStat {
  number_id: string;
  number_label: string;
  number_value: string;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
}

interface PaymentStatusCount {
  name: string;
  value: number;
  color: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

const PIE_COLORS: Record<string, string> = {
  paid: '#22c55e',
  pending: '#f59e0b',
  failed: '#ef4444',
};

const PIE_LABELS: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  // KPI state
  const [revenue, setRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [paidOrders, setPaidOrders] = useState(0);

  // Chart state
  const [clickStats, setClickStats] = useState<ClickStat[]>([]);
  const [paymentPie, setPaymentPie] = useState<PaymentStatusCount[]>([]);

  // Recent orders state
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Referral stats
  const [referralStats, setReferralStats] = useState<{ name: string; vendas: number; receita: number; ticket: number; conversao: string; total: number }[]>([]);

  // Global loading
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Fetch everything once
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function fetchAll() {
      const [
        revenueRes,
        totalRes,
        paidRes,
        allOrdersRes,
        recentRes,
        clickStatsRes,
        referralRes,
      ] = await Promise.all([
        supabase.from('orders').select('valor_total').eq('payment_status', 'paid'),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'paid'),
        supabase.from('orders').select('payment_status'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.rpc('get_click_stats'),
        supabase.from('orders').select('referral_source, valor_total, payment_status').not('referral_source', 'is', null),
      ]);

      // Revenue
      const totalRevenue = (revenueRes.data || []).reduce(
        (sum, o) => sum + Number(o.valor_total),
        0,
      );
      setRevenue(totalRevenue);

      // Counts
      setTotalOrders(totalRes.count || 0);
      setPaidOrders(paidRes.count || 0);

      // Payment status pie
      const statusMap: Record<string, number> = {};
      (allOrdersRes.data || []).forEach((o) => {
        const s = o.payment_status;
        statusMap[s] = (statusMap[s] || 0) + 1;
      });
      const pieData: PaymentStatusCount[] = Object.entries(statusMap).map(([key, val]) => ({
        name: PIE_LABELS[key] || key,
        value: val,
        color: PIE_COLORS[key] || '#94a3b8',
      }));
      setPaymentPie(pieData);

      // Recent orders
      setRecentOrders(recentRes.data || []);

      // Click stats
      setClickStats((clickStatsRes.data as ClickStat[]) || []);

      // Referral stats (agrupado por chip)
      const refRows = referralRes.data || [];
      const refMap: Record<string, { total: number; paid: number; receita: number }> = {};
      for (const r of refRows) {
        const src = (r as { referral_source: string }).referral_source;
        if (!refMap[src]) refMap[src] = { total: 0, paid: 0, receita: 0 };
        refMap[src].total++;
        if ((r as { payment_status: string }).payment_status === 'paid') {
          refMap[src].paid++;
          refMap[src].receita += Number((r as { valor_total: number }).valor_total);
        }
      }
      const refStats = Object.entries(refMap)
        .map(([name, d]) => ({
          name,
          vendas: d.paid,
          receita: d.receita,
          ticket: d.paid > 0 ? d.receita / d.paid : 0,
          conversao: d.total > 0 ? ((d.paid / d.total) * 100).toFixed(0) : '0',
          total: d.total,
        }))
        .sort((a, b) => b.receita - a.receita);
      setReferralStats(refStats);

      setLoading(false);
    }

    fetchAll();
  }, []);

  // -------------------------------------------------------------------------
  // Derived KPIs
  // -------------------------------------------------------------------------
  const conversionRate =
    totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(1) : '0.0';

  const kpiCards = [
    {
      label: 'Receita Total',
      value: formatBRL(revenue),
      icon: DollarSign,
      color: 'bg-green-500/10 text-green-600',
    },
    {
      label: 'Taxa de Conversão',
      value: `${conversionRate}%`,
      icon: TrendingUp,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      label: 'Total de Pedidos',
      value: totalOrders,
      icon: ShoppingCart,
      color: 'bg-accent/10 text-accent',
    },
    {
      label: 'Pedidos Pagos',
      value: paidOrders,
      icon: CheckCircle,
      color: 'bg-green-500/10 text-green-600',
    },
  ];


  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      </AdminLayout>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <AdminLayout title="Dashboard">
      {/* ----------------------------------------------------------------- */}
      {/* KPI Cards                                                         */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground font-medium">{kpi.label}</span>
                <div
                  className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center`}
                >
                  <kpi.icon size={20} />
                </div>
              </div>
              <span className="font-display text-3xl font-bold text-foreground">{kpi.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Charts Row                                                        */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart - Cliques por WhatsApp */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cliques por WhatsApp</CardTitle>
          </CardHeader>
          <CardContent>
            {clickStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={clickStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="number_label"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="total_clicks"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    name="Total"
                  />
                  <Bar
                    dataKey="clicks_today"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    name="Hoje"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm py-16 text-center">
                Nenhum clique registrado ainda.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Status dos Pagamentos */}
        <Card className="shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Status dos Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center">
            {paymentPie.length > 0 ? (
              <div className="flex items-center gap-8 w-full max-w-sm mx-auto">
                <div className="w-32 h-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        label={false}
                        stroke="none"
                      >
                        {paymentPie.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5">
                  {paymentPie.map((item) => {
                    const total = paymentPie.reduce((s, i) => s + i.value, 0);
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-foreground w-20">{item.name}</span>
                        <span className="text-sm font-bold text-foreground tabular-nums">{item.value}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-16 text-center">
                Nenhum pedido registrado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Resultado por Atendimento                                        */}
      {/* ----------------------------------------------------------------- */}
      <Card className="shadow-sm mb-8">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Resultado por Atendimento</CardTitle>
            {referralStats.length > 0 && (
              <Badge variant="secondary">{referralStats.length} ativo{referralStats.length !== 1 ? 's' : ''}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {referralStats.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-t bg-muted/50">
                      <th className="text-left p-3 font-semibold text-foreground">Atendimento</th>
                      <th className="text-right p-3 font-semibold text-foreground">Receita</th>
                      <th className="text-right p-3 font-semibold text-foreground">Vendas</th>
                      <th className="text-right p-3 font-semibold text-foreground hidden sm:table-cell">Pedidos</th>
                      <th className="text-right p-3 font-semibold text-foreground hidden md:table-cell">Ticket</th>
                      <th className="text-right p-3 font-semibold text-foreground">Conv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referralStats.map((r) => (
                      <tr key={r.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium text-foreground">{r.name}</td>
                        <td className="p-3 text-right font-bold tabular-nums">{formatBRL(r.receita)}</td>
                        <td className="p-3 text-right font-medium text-green-600 tabular-nums">{r.vendas}</td>
                        <td className="p-3 text-right text-muted-foreground tabular-nums hidden sm:table-cell">{r.total}</td>
                        <td className="p-3 text-right text-muted-foreground tabular-nums hidden md:table-cell">{formatBRL(r.ticket)}</td>
                        <td className="p-3 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${Number(r.conversao) >= 50 ? 'bg-green-100 text-green-800' : Number(r.conversao) > 0 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                            {r.conversao}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/30 font-bold">
                      <td className="p-3 text-foreground">Total</td>
                      <td className="p-3 text-right tabular-nums">{formatBRL(referralStats.reduce((s, r) => s + r.receita, 0))}</td>
                      <td className="p-3 text-right text-green-600 tabular-nums">{referralStats.reduce((s, r) => s + r.vendas, 0)}</td>
                      <td className="p-3 text-right tabular-nums hidden sm:table-cell">{referralStats.reduce((s, r) => s + r.total, 0)}</td>
                      <td className="p-3 text-right tabular-nums hidden md:table-cell">
                        {(() => {
                          const totalR = referralStats.reduce((s, r) => s + r.receita, 0);
                          const totalV = referralStats.reduce((s, r) => s + r.vendas, 0);
                          return formatBRL(totalV > 0 ? totalR / totalV : 0);
                        })()}
                      </td>
                      <td className="p-3 text-right">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {(() => {
                            const totalP = referralStats.reduce((s, r) => s + r.total, 0);
                            const totalV = referralStats.reduce((s, r) => s + r.vendas, 0);
                            return totalP > 0 ? ((totalV / totalP) * 100).toFixed(0) : '0';
                          })()}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <div className="py-8 px-4">
              <p className="text-sm text-muted-foreground text-center">
                Os resultados aparecerão quando pedidos com link de atendimento (<code className="bg-muted px-1 rounded text-xs">?ref=</code>) forem registrados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Últimos Pedidos                                                   */}
      {/* ----------------------------------------------------------------- */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Últimos Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Data</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Cliente</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Caçamba</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Valor</th>
                  <th className="text-left p-4 text-sm font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum pedido recebido ainda.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-foreground">{order.nome}</div>
                        <div className="text-xs text-muted-foreground">{order.whatsapp}</div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {order.tamanho} x{order.quantidade}
                      </td>
                      <td className="p-4 text-sm font-medium text-foreground">
                        {formatBRL(Number(order.valor_total))}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={
                            order.payment_status === 'paid'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }
                        >
                          {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
