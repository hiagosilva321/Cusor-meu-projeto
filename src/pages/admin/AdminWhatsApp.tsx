import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import {
  Plus, Trash2, Save, MousePointerClick, Phone,
  Users, Inbox, Info, HelpCircle, BarChart3, Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

/* ─── Types ─── */

interface WhatsAppNumber {
  id: string;
  number: string;
  label: string;
  active: boolean;
  click_count: number;
  peso_distribuicao: number;
  order_index: number;
  isNew?: boolean;
}

interface ClickStats {
  number_id: string;
  number_label: string;
  number_value: string;
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
}

interface SectionClick {
  section: string;
  total_clicks: number;
  unique_visitors: number;
}

/* ─── Colors ─── */

const GREEN_SHADES = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#166534', '#15803d'];
const SECTION_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4'];

function toSlug(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ─── Component ─── */

export default function AdminWhatsApp() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [uniqueVisitors, setUniqueVisitors] = useState(0);
  const [clickStats, setClickStats] = useState<Record<string, ClickStats>>({});
  const [sectionClicks, setSectionClicks] = useState<SectionClick[]>([]);
  const [rotationSize, setRotationSize] = useState(5);
  const [savingRotation, setSavingRotation] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [numbersRes, statsRes, uniqueRes, sectionsRes, settingsRes] = await Promise.all([
        supabase.from('whatsapp_numbers').select('*').order('order_index'),
        supabase.rpc('get_click_stats'),
        supabase.rpc('get_whatsapp_unique_visitors'),
        supabase.rpc('get_clicks_by_section'),
        supabase.from('site_settings').select('whatsapp_rotation_size').limit(1).single(),
      ]);

      if (settingsRes.data?.whatsapp_rotation_size) {
        setRotationSize(settingsRes.data.whatsapp_rotation_size);
      }

      if (numbersRes.data) setNumbers(numbersRes.data as WhatsAppNumber[]);

      if (statsRes.data) {
        const map: Record<string, ClickStats> = {};
        for (const s of statsRes.data) {
          const stat = s as ClickStats;
          map[stat.number_id] = stat;
        }
        setClickStats(map);
      }

      if (uniqueRes.data && uniqueRes.data.length > 0) {
        const row = uniqueRes.data[0] as { total_clicks: number; unique_visitors: number };
        setTotalClicks(Number(row.total_clicks));
        setUniqueVisitors(Number(row.unique_visitors));
      }

      if (sectionsRes.data) {
        setSectionClicks(sectionsRes.data as SectionClick[]);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  /* ─── CRUD ─── */

  const handleSaveRotation = async (newSize: number) => {
    const clamped = Math.max(1, Math.min(100, newSize));
    setRotationSize(clamped);
    setSavingRotation(true);
    const { error } = await supabase.from('site_settings').update({ whatsapp_rotation_size: clamped }).not('id', 'is', null);
    if (error) {
      toast.error('Erro ao salvar rotação');
    } else {
      toast.success(`Rotação atualizada: a cada ${clamped} cliques`);
    }
    setSavingRotation(false);
  };

  const updateField = (id: string, field: keyof WhatsAppNumber, value: string | number | boolean) => {
    setNumbers(numbers.map((n) => (n.id === id ? { ...n, [field]: value } : n)));
  };

  const toggleActive = (id: string) => {
    setNumbers(numbers.map((n) => (n.id === id ? { ...n, active: !n.active } : n)));
  };

  const removeNumber = async (id: string, isNew?: boolean) => {
    if (!isNew) await supabase.from('whatsapp_numbers').delete().eq('id', id);
    setNumbers(numbers.filter((n) => n.id !== id));
    toast.success('Número removido');
  };

  const addNumber = () => {
    setNumbers([...numbers, {
      id: crypto.randomUUID(), number: '', label: '', active: true,
      click_count: 0, peso_distribuicao: 1, order_index: numbers.length + 1, isNew: true,
    }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < numbers.length; i++) {
        const n = numbers[i];
        const data = {
          number: n.number, label: n.label, active: n.active,
          peso_distribuicao: Math.max(1, Number(n.peso_distribuicao) || 1),
          order_index: i + 1,
        };
        if (n.isNew) {
          await supabase.from('whatsapp_numbers').insert({ ...data, id: n.id });
        } else {
          await supabase.from('whatsapp_numbers').update(data).eq('id', n.id);
        }
      }
      setNumbers(numbers.map((n) => ({ ...n, isNew: false })));
      toast.success('Números salvos!');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  /* ─── Derived ─── */

  const activeCount = numbers.filter((n) => n.active).length;
  const totalPeso = numbers.reduce((sum, n) => sum + (n.active ? n.peso_distribuicao : 0), 0);
  const pieData = numbers
    .filter((n) => n.active && n.peso_distribuicao > 0)
    .map((n) => ({
      name: n.label || n.number,
      value: totalPeso > 0 ? Math.round((n.peso_distribuicao / totalPeso) * 100) : 0,
    }));

  const sectionBarData = sectionClicks.map((s) => ({
    name: s.section,
    cliques: Number(s.total_clicks),
    unicos: Number(s.unique_visitors),
  }));

  if (loading) {
    return (
      <AdminLayout title="WhatsApp">
        <p className="text-muted-foreground">Carregando...</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="WhatsApp">
      <TooltipProvider>
        <div className="space-y-8">

          {/* ═══ KPI Cards ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <MousePointerClick size={20} className="text-amber-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Cliques</p>
                    <p className="font-display text-3xl font-bold text-foreground">{totalClicks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Users size={20} className="text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Visitantes Únicos</p>
                    <p className="font-display text-3xl font-bold text-foreground">{uniqueVisitors}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <Phone size={20} className="text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Números Ativos</p>
                    <p className="font-display text-3xl font-bold text-foreground">{activeCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <BarChart3 size={20} className="text-purple-700" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliques/Visitante</p>
                    <p className="font-display text-3xl font-bold text-foreground">
                      {uniqueVisitors > 0 ? (totalClicks / uniqueVisitors).toFixed(1) : '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ═══ Controle de Rotação ═══ */}
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Rotação de cliques</p>
                  <p className="text-xs text-muted-foreground">A cada quantos cliques o sistema muda para o próximo número</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[5, 10, 15, 20].map((n) => (
                      <Button
                        key={n}
                        variant={rotationSize === n ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSaveRotation(n)}
                        disabled={savingRotation}
                        className="min-w-[40px]"
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={rotationSize}
                      onChange={(e) => setRotationSize(Math.max(1, Number(e.target.value)))}
                      className="w-16 text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSaveRotation(rotationSize)}
                      disabled={savingRotation}
                    >
                      {savingRotation ? '...' : 'Aplicar'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══ Charts ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cliques por Seção da LP */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Cliques por Seção da Landing Page</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                {sectionBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sectionBarData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                      <RechartsTooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                      <Bar dataKey="cliques" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Cliques" />
                      <Bar dataKey="unicos" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Únicos" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm py-16 text-center">Nenhum clique registrado ainda.</p>
                )}
              </CardContent>
            </Card>

            {/* Peso de Distribuição */}
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Peso de Distribuição</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center">
                {pieData.length > 0 ? (
                  <div className="flex items-center gap-8 w-full max-w-sm mx-auto">
                    <div className="w-32 h-32 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={55}
                            paddingAngle={3} dataKey="value" label={false} stroke="none">
                            {pieData.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={GREEN_SHADES[index % GREEN_SHADES.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip formatter={(value: number) => [`${value}%`, 'Peso']}
                            contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2.5">
                      {pieData.map((item, index) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: GREEN_SHADES[index % GREEN_SHADES.length] }} />
                          <span className="text-sm text-foreground w-24">{item.name}</span>
                          <span className="text-sm font-bold text-foreground tabular-nums">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-16 text-center">Nenhum número ativo.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ═══ Números ═══ */}
          <div>
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Números de Atendimento</h2>
            <div className="space-y-4">
              {numbers.length === 0 && (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Inbox className="text-muted-foreground" size={28} />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhum número cadastrado</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">Adicione um número para começar a rotação.</p>
                </div>
              )}

              {numbers.map((num) => {
                const stats = clickStats[num.id];
                return (
                  <Card key={num.id} className={!num.active ? 'opacity-50' : ''}>
                    <CardContent className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-1.5">
                          <Label htmlFor={`lbl-${num.id}`}>Nome do número</Label>
                          <Input id={`lbl-${num.id}`} placeholder="Atendimento 1"
                            value={num.label} onChange={(e) => updateField(num.id, 'label', e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`num-${num.id}`}>Número WhatsApp</Label>
                          <Input id={`num-${num.id}`} placeholder="5511999999001"
                            value={num.number} onChange={(e) => updateField(num.id, 'number', e.target.value)} />
                        </div>
                      </div>

                      {/* Link de Checkout trackeado */}
                      {num.label && (
                        <div className="mb-4 space-y-1.5">
                          <Label>Link de Checkout</Label>
                          <div className="flex gap-2">
                            <Input
                              readOnly
                              value={`${window.location.origin}/checkout?ref=${toSlug(num.label)}`}
                              className="bg-muted text-muted-foreground text-xs font-mono"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0"
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/checkout?ref=${toSlug(num.label)}`);
                                toast.success('Link copiado!');
                              }}
                            >
                              <Copy size={14} className="mr-1.5" /> Copiar
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Use este link no WaveSpeed para rastrear vendas deste atendimento.</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor={`peso-${num.id}`}>Peso</Label>
                            <Tooltip>
                              <TooltipTrigger><HelpCircle size={13} className="text-muted-foreground" /></TooltipTrigger>
                              <TooltipContent className="max-w-[200px]">
                                Quanto maior o peso, mais cliques esse número recebe na rotação automática.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input id={`peso-${num.id}`} type="number" min={1} className="w-20"
                            value={num.peso_distribuicao} onChange={(e) => updateField(num.id, 'peso_distribuicao', Math.max(1, Number(e.target.value)))} />
                        </div>

                        <div className="flex gap-2">
                          <Badge variant="secondary">{stats?.total_clicks ?? num.click_count} total</Badge>
                          <Badge variant="outline">{stats?.clicks_today ?? 0} hoje</Badge>
                          <Badge variant="outline">{stats?.clicks_week ?? 0} semana</Badge>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <Switch checked={num.active} onCheckedChange={() => toggleActive(num.id)} />
                          <span className="text-sm text-muted-foreground">{num.active ? 'Ativo' : 'Inativo'}</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="px-5 py-3 border-t flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => removeNumber(num.id, num.isNew)}
                        className="text-destructive hover:text-destructive">
                        <Trash2 size={14} className="mr-1.5" /> Remover
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}

              <Button variant="outline" onClick={addNumber} className="w-full">
                <Plus size={18} className="mr-2" /> Adicionar Número
              </Button>

              <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
                <Save size={18} className="mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>

          {/* ═══ Info ═══ */}
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-5 flex gap-3">
              <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 space-y-1">
                <p className="font-medium">Como funciona a rotação</p>
                <p>O sistema distribui cliques proporcionalmente ao peso de cada número. Visitantes recorrentes sempre veem o mesmo número (atribuição fixa). Os cliques são contabilizados por seção da landing page: botão flutuante, header, tamanhos, CTA e formulário.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    </AdminLayout>
  );
}
