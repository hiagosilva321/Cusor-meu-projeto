import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Save, MousePointerClick, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

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
  total_clicks: number;
  clicks_today: number;
  clicks_week: number;
}

export default function AdminWhatsApp() {
  const [numbers, setNumbers] = useState<WhatsAppNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [clickStats, setClickStats] = useState<Record<string, ClickStats>>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [rotacaoAtiva, setRotacaoAtiva] = useState(true);
  const [rotacaoACada, setRotacaoACada] = useState(10);

  useEffect(() => {
    async function fetch() {
      const [numbersRes, clicksRes, statsRes, settingsRes] = await Promise.all([
        supabase.from('whatsapp_numbers').select('*').order('order_index'),
        supabase.from('whatsapp_clicks').select('id', { count: 'exact', head: true }),
        supabase.rpc('get_click_stats'),
        supabase
          .from('site_settings')
          .select('id, whatsapp_rotacao_ativa, whatsapp_rotacao_a_cada')
          .limit(1)
          .maybeSingle(),
      ]);

      if (numbersRes.data) setNumbers(numbersRes.data as WhatsAppNumber[]);
      setTotalClicks(clicksRes.count || 0);

      if (statsRes.data) {
        const map: Record<string, ClickStats> = {};
        for (const s of statsRes.data) {
          map[s.number_id] = s as ClickStats;
        }
        setClickStats(map);
      }

      const st = settingsRes.data as {
        id?: string;
        whatsapp_rotacao_ativa?: boolean | null;
        whatsapp_rotacao_a_cada?: number | null;
      } | null;
      if (st?.id) {
        setSettingsId(st.id);
        setRotacaoAtiva(st.whatsapp_rotacao_ativa !== false);
        const cada = Number(st.whatsapp_rotacao_a_cada);
        setRotacaoACada(Number.isFinite(cada) && cada >= 1 ? cada : 10);
      }

      setLoading(false);
    }
    fetch();
  }, []);

  const toggleActive = (id: string) => {
    setNumbers(numbers.map(n => n.id === id ? { ...n, active: !n.active } : n));
  };

  const removeNumber = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('whatsapp_numbers').delete().eq('id', id);
    }
    setNumbers(numbers.filter(n => n.id !== id));
    toast.success('Removido');
  };

  const addNumber = () => {
    setNumbers([...numbers, {
      id: crypto.randomUUID(), number: '', label: '', active: true,
      click_count: 0, peso_distribuicao: 1, order_index: numbers.length + 1, isNew: true,
    }]);
  };

  const updateField = (id: string, field: keyof WhatsAppNumber, value: any) => {
    setNumbers(numbers.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < numbers.length; i++) {
        const n = numbers[i];
        const data = {
          number: n.number, label: n.label, active: n.active,
          peso_distribuicao: Number(n.peso_distribuicao) || 1,
          order_index: i + 1,
        };

        if (n.isNew) {
          await supabase.from('whatsapp_numbers').insert({ ...data, id: n.id });
        } else {
          await supabase.from('whatsapp_numbers').update(data).eq('id', n.id);
        }
      }
      setNumbers(numbers.map(n => ({ ...n, isNew: false })));

      const cada = Math.max(1, Math.min(10000, Math.round(Number(rotacaoACada)) || 10));
      if (settingsId) {
        const { error: setErr } = await supabase
          .from('site_settings')
          .update({
            whatsapp_rotacao_ativa: rotacaoAtiva,
            whatsapp_rotacao_a_cada: cada,
          })
          .eq('id', settingsId);
        if (setErr) throw setErr;
        setRotacaoACada(cada);
      }

      toast.success('Números e rotação salvos com sucesso!');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  const activeCount = numbers.filter((n) => n.active).length;
  const mostClicked = [...numbers].sort((a, b) => b.click_count - a.click_count)[0];
  const rotacaoCadaSafe = Math.max(1, Math.min(10000, Math.round(Number(rotacaoACada)) || 10));

  const activeOrdered = useMemo(
    () => [...numbers].filter((n) => n.active).sort((a, b) => a.order_index - b.order_index),
    [numbers],
  );

  const rotacaoPreview = useMemo(() => {
    const n = activeOrdered.length;
    if (n === 0) {
      return { proximoLabel: '—', slotIndex: 0, ateTrocar: rotacaoCadaSafe };
    }
    const slotIndex = Math.floor(totalClicks / rotacaoCadaSafe) % n;
    const proximo = activeOrdered[slotIndex];
    const mod = totalClicks % rotacaoCadaSafe;
    const ateTrocar = mod === 0 ? rotacaoCadaSafe : rotacaoCadaSafe - mod;
    return {
      proximoLabel: proximo?.label || proximo?.number || '—',
      slotIndex,
      ateTrocar,
    };
  }, [activeOrdered, totalClicks, rotacaoCadaSafe]);

  if (loading) return <AdminLayout title="Números de WhatsApp"><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Números de WhatsApp">
      <div className="mb-8 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <RefreshCw className="text-whatsapp size-5" aria-hidden />
          <h2 className="font-display text-lg font-bold text-foreground">WhatsApp rotativo no site</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
          Com a rotação <strong className="text-foreground">ligada</strong>, cada clique no WhatsApp da página conta para o site inteiro.
          A cada <strong className="text-foreground">N cliques</strong>, o próximo número <strong className="text-foreground">ativo</strong> é
          usado, na ordem da lista abaixo (campo de ordenação ao guardar = ordem de exibição).
          Os números ligados no painel são os que entram na fila — como os atendentes no telemóvel.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Switch id="rotacao-ativa" checked={rotacaoAtiva} onCheckedChange={setRotacaoAtiva} />
              <Label htmlFor="rotacao-ativa" className="cursor-pointer text-sm font-medium">
                Rotação ativa (recomendado)
              </Label>
            </div>
            <p className="text-muted-foreground max-w-xl text-xs">
              Desligar volta ao modo antigo: <strong className="text-foreground">peso</strong> por número e o mesmo visitante fica com o
              último número em que clicou.
            </p>
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-48">
            <Label htmlFor="rotacao-cada">Trocar a cada (cliques)</Label>
            <Input
              id="rotacao-cada"
              type="number"
              min={1}
              max={10000}
              value={rotacaoACada}
              onChange={(e) => setRotacaoACada(Number(e.target.value))}
            />
          </div>
        </div>
        {rotacaoAtiva && activeCount > 0 ? (
          <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Próximo clique no site tende a abrir: </span>
            <strong className="text-foreground">{rotacaoPreview.proximoLabel}</strong>
            <span className="text-muted-foreground">
              {' '}
              (fila {rotacaoPreview.slotIndex + 1}/{activeCount}) · ~{rotacaoPreview.ateTrocar} clique(s) até a próxima troca de número
            </span>
          </div>
        ) : null}
        {!settingsId ? (
          <p className="text-destructive mt-3 text-xs">
            Não foi possível carregar <code className="rounded bg-muted px-1">site_settings</code>. Aplique a migração SQL no Supabase
            (ficheiro <code className="rounded bg-muted px-1">supabase/migrations/20260324180000_whatsapp_rotacao.sql</code>) e recarregue
            esta página.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <span className="text-sm text-muted-foreground">Total de Cliques</span>
          <div className="font-display text-3xl font-bold text-foreground mt-1">{totalClicks}</div>
        </div>
        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <span className="text-sm text-muted-foreground">Números Ativos</span>
          <div className="font-display text-3xl font-bold text-foreground mt-1">{activeCount}</div>
        </div>
        <div className="p-5 rounded-xl bg-card border shadow-sm">
          <span className="text-sm text-muted-foreground">Mais Clicado</span>
          <div className="font-display text-lg font-bold text-foreground mt-1">
            {mostClicked?.label || '-'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {numbers.map((num) => {
          const stats = clickStats[num.id];
          return (
            <div key={num.id} className="p-4 rounded-xl bg-card border shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
                <Input placeholder="Nome (ex: Número 1)" value={num.label}
                  onChange={(e) => updateField(num.id, 'label', e.target.value)} />
                <Input placeholder="Número (ex: 5511999999901)" value={num.number}
                  onChange={(e) => updateField(num.id, 'number', e.target.value)} />
                <div className="flex flex-col gap-0.5">
                  <Input placeholder="Peso" type="number" value={num.peso_distribuicao}
                    onChange={(e) => updateField(num.id, 'peso_distribuicao', e.target.value)} />
                  <span className="text-muted-foreground text-[10px] leading-tight">
                    {rotacaoAtiva ? 'Só com rotação desligada' : 'Distribuição por peso'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MousePointerClick size={14} className="text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{stats?.total_clicks ?? num.click_count} total</span>
                    <span className="text-muted-foreground text-xs">
                      {stats?.clicks_today ?? 0} hoje · {stats?.clicks_week ?? 0} semana
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={num.active} onCheckedChange={() => toggleActive(num.id)} />
                  <span className="text-sm text-muted-foreground">{num.active ? 'Ativo' : 'Inativo'}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeNumber(num.id, num.isNew)} className="text-destructive ml-auto">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
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
    </AdminLayout>
  );
}
