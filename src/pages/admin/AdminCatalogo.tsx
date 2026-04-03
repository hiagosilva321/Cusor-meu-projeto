import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, Pencil, Inbox } from 'lucide-react';
import { toast } from 'sonner';

interface DumpsterSize {
  id: string;
  size: string;
  title: string;
  description: string;
  price: number;
  active: boolean;
  order_index: number;
  isNew?: boolean;
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminCatalogo() {
  const [sizes, setSizes] = useState<DumpsterSize[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('dumpster_sizes').select('*').order('order_index');
      if (data) setSizes(data as DumpsterSize[]);
      setLoading(false);
    }
    fetch();
  }, []);

  const updateField = (id: string, field: keyof DumpsterSize, value: string | number | boolean) => {
    setSizes(sizes.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleActive = (id: string) => {
    setSizes(sizes.map((s) => (s.id === id ? { ...s, active: !s.active } : s)));
  };

  const remove = async (id: string, isNew?: boolean) => {
    if (!isNew) await supabase.from('dumpster_sizes').delete().eq('id', id);
    setSizes(sizes.filter((s) => s.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success('Tamanho removido');
  };

  const add = () => {
    const newId = crypto.randomUUID();
    setSizes([...sizes, { id: newId, size: '', title: '', description: '', price: 0, active: true, order_index: sizes.length + 1, isNew: true }]);
    setEditingId(newId);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < sizes.length; i++) {
        const s = sizes[i];
        const data = { size: s.size, title: s.title, description: s.description, price: Number(s.price), active: s.active, order_index: i + 1 };
        if (s.isNew) {
          await supabase.from('dumpster_sizes').insert({ ...data, id: s.id });
        } else {
          await supabase.from('dumpster_sizes').update(data).eq('id', s.id);
        }
      }
      setSizes(sizes.map((s) => ({ ...s, isNew: false })));
      setEditingId(null);
      toast.success('Catálogo salvo! As mudanças já aparecem na landing page e no checkout.');
    } catch {
      toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  if (loading) return <AdminLayout title="Catálogo"><p className="text-muted-foreground">Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Catálogo">
      <p className="text-sm text-muted-foreground mb-6">
        Os tamanhos e preços cadastrados aqui aparecem na landing page, no checkout e definem o valor cobrado no PIX.
      </p>

      <div className="space-y-6">
        {sizes.length === 0 && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Inbox className="text-muted-foreground" size={28} />
            </div>
            <p className="text-muted-foreground font-medium">Nenhum tamanho cadastrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Clique em "Adicionar Tamanho" para criar o primeiro.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sizes.map((size) => {
            const isEditing = editingId === size.id || size.isNew;
            return (
              <Card key={size.id} className={!size.active ? 'opacity-50' : ''}>
                <CardHeader className="pb-3">
                  {isEditing ? (
                    <div className="flex items-start gap-3">
                      <div className="space-y-1">
                        <Label htmlFor={`sz-${size.id}`}>Tamanho</Label>
                        <Input id={`sz-${size.id}`} placeholder="5m³" value={size.size} onChange={(e) => updateField(size.id, 'size', e.target.value)} className="w-24" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <Label htmlFor={`tt-${size.id}`}>Título</Label>
                        <Input id={`tt-${size.id}`} placeholder="Mais Solicitada" value={size.title} onChange={(e) => updateField(size.id, 'title', e.target.value)} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">{size.size || '—'}</Badge>
                      <span className="font-bold text-foreground">{size.title || 'Sem título'}</span>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pb-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label htmlFor={`ds-${size.id}`}>Descrição</Label>
                        <Input id={`ds-${size.id}`} placeholder="Para reformas médias..." value={size.description} onChange={(e) => updateField(size.id, 'description', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`pr-${size.id}`}>Preço (R$)</Label>
                        <Input id={`pr-${size.id}`} type="number" step="0.01" placeholder="330.00" value={size.price || ''} onChange={(e) => updateField(size.id, 'price', Number(e.target.value))} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{size.description || 'Sem descrição'}</p>
                      <p className="text-2xl font-bold text-foreground">{formatBRL(size.price)}</p>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch checked={size.active} onCheckedChange={() => toggleActive(size.id)} />
                    <span className="text-sm text-muted-foreground">{size.active ? 'Ativo' : 'Inativo'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingId(isEditing ? null : size.id)} className="text-muted-foreground hover:text-foreground">
                      <Pencil size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(size.id, size.isNew)} className="text-destructive hover:text-destructive">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <Button variant="outline" onClick={add} className="w-full">
          <Plus size={18} className="mr-2" /> Adicionar Tamanho
        </Button>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </AdminLayout>
  );
}
