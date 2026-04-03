import { useEffect, useState, FormEvent } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/use-site-settings';
import type { Tables } from '@/integrations/supabase/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Save,
  Plus,
  X,
  Inbox,
  KeyRound,
  Mail,
  Building2,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { mapSupabaseAuthError } from '@/lib/auth-errors';

/* ─── Types ─── */

interface Region {
  id: string;
  name: string;
  active: boolean;
  order_index: number;
  isNew?: boolean;
}

/* ─── Component ─── */

export default function AdminConfiguracoes() {
  const { refresh: refreshGlobalSettings } = useSiteSettings();

  /* ─── Tab: Dados da Empresa ─── */
  const [settings, setSettings] = useState<Tables<'site_settings'> | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  /* ─── Tab: Regiões ─── */
  const [regions, setRegions] = useState<Region[]>([]);
  const [newRegion, setNewRegion] = useState('');
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [savingRegions, setSavingRegions] = useState(false);

  /* ─── Tab: Conta Admin ─── */
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const [emailNew, setEmailNew] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  /* ─── Fetch all data ─── */

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('site_settings').select('*').limit(1).single();
      if (data) setSettings(data);
      setLoadingSettings(false);
    }

    async function fetchRegions() {
      const { data } = await supabase.from('regions').select('*').order('order_index');
      if (data) setRegions(data as Region[]);
      setLoadingRegions(false);
    }

    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAdminEmail(user?.email ?? null);
    }

    fetchSettings();
    fetchRegions();
    fetchUser();
  }, []);

  /* ─── Settings handlers ─── */

  const handleSettingsChange = (
    field: keyof Pick<
      Tables<'site_settings'>,
      'site_name' | 'telefone_principal' | 'whatsapp_principal' | 'endereco_empresa' | 'email_contato'
    >,
    value: string,
  ) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase
      .from('site_settings')
      .update({
        site_name: settings.site_name,
        telefone_principal: settings.telefone_principal,
        whatsapp_principal: settings.whatsapp_principal,
        endereco_empresa: settings.endereco_empresa,
        email_contato: settings.email_contato,
        helper_price: Number(settings.helper_price) || 125,
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Erro ao salvar configurações');
    } else {
      await refreshGlobalSettings();
      toast.success('Configurações salvas!');
    }
    setSavingSettings(false);
  };

  /* ─── Regions handlers ─── */

  const addRegion = () => {
    const trimmed = newRegion.trim();
    if (!trimmed) return;
    setRegions([
      ...regions,
      {
        id: crypto.randomUUID(),
        name: trimmed,
        active: true,
        order_index: regions.length + 1,
        isNew: true,
      },
    ]);
    setNewRegion('');
  };

  const toggleRegionActive = (id: string) => {
    setRegions(regions.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));
  };

  const removeRegion = async (id: string, isNew?: boolean) => {
    if (!isNew) {
      await supabase.from('regions').delete().eq('id', id);
    }
    setRegions(regions.filter((r) => r.id !== id));
    toast.success('Região removida');
  };

  const handleSaveRegions = async () => {
    setSavingRegions(true);
    try {
      for (let i = 0; i < regions.length; i++) {
        const r = regions[i];
        const data = { name: r.name, active: r.active, order_index: i + 1 };
        if (r.isNew) {
          await supabase.from('regions').insert({ ...data, id: r.id });
        } else {
          await supabase.from('regions').update(data).eq('id', r.id);
        }
      }
      setRegions(regions.map((r) => ({ ...r, isNew: false })));
      toast.success('Regiões salvas com sucesso!');
    } catch {
      toast.error('Erro ao salvar regiões');
    }
    setSavingRegions(false);
  };

  /* ─── Password change ─── */

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminEmail) return;
    if (pwdNew.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      toast.error('Nova senha e confirmação não coincidem.');
      return;
    }
    setPwdSaving(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: pwdCurrent,
      });
      if (signErr) {
        toast.error('Senha atual incorreta.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pwdNew });
      if (error) throw error;
      toast.success('Senha alterada com sucesso! Use a nova senha no próximo login.');
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    } catch (err: unknown) {
      const ex = err as { message?: string };
      toast.error(mapSupabaseAuthError(ex.message || ''));
    } finally {
      setPwdSaving(false);
    }
  };

  /* ─── Email change ─── */

  const handleEmailChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminEmail) return;
    const next = emailNew.trim().toLowerCase();
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast.error('Indique um e-mail válido.');
      return;
    }
    if (next === adminEmail.toLowerCase()) {
      toast.error('O novo e-mail é igual ao atual.');
      return;
    }
    setEmailSaving(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: emailPwd,
      });
      if (signErr) {
        toast.error('Senha incorreta — confirme a sua identidade.');
        return;
      }
      const { error } = await supabase.auth.updateUser({ email: next });
      if (error) throw error;
      toast.success(
        'E-mail atualizado. Se o Supabase exigir confirmação, abra a mensagem no novo e-mail. Pode precisar entrar novamente.',
        { duration: 8000 },
      );
      setEmailNew('');
      setEmailPwd('');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAdminEmail(user?.email ?? next);
    } catch (err: unknown) {
      const ex = err as { message?: string };
      toast.error(mapSupabaseAuthError(ex.message || ''));
    } finally {
      setEmailSaving(false);
    }
  };

  /* ─── Render ─── */

  return (
    <AdminLayout title="Configurações">
      <Tabs defaultValue="empresa" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="empresa">Dados da Empresa</TabsTrigger>
          <TabsTrigger value="regioes">Regiões Atendidas</TabsTrigger>
          <TabsTrigger value="conta">Conta Admin</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Dados da Empresa ═══ */}
        <TabsContent value="empresa">
          {loadingSettings ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="max-w-2xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 size={20} className="text-accent" />
                    Dados da Empresa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="setting-site-name">Nome do Site</Label>
                    <Input
                      id="setting-site-name"
                      value={settings?.site_name || ''}
                      onChange={(e) => handleSettingsChange('site_name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="setting-telefone">Telefone Principal</Label>
                    <Input
                      id="setting-telefone"
                      value={settings?.telefone_principal || ''}
                      onChange={(e) => handleSettingsChange('telefone_principal', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="setting-whatsapp">WhatsApp Principal</Label>
                    <Input
                      id="setting-whatsapp"
                      value={settings?.whatsapp_principal || ''}
                      onChange={(e) => handleSettingsChange('whatsapp_principal', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="setting-endereco">Endereço da Empresa</Label>
                    <Textarea
                      id="setting-endereco"
                      className="min-h-[80px]"
                      value={settings?.endereco_empresa || ''}
                      onChange={(e) => handleSettingsChange('endereco_empresa', e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="setting-email">E-mail de Contato</Label>
                    <Input
                      id="setting-email"
                      type="email"
                      value={settings?.email_contato || ''}
                      onChange={(e) => handleSettingsChange('email_contato', e.target.value)}
                    />
                  </div>

                  <hr className="my-4" />

                  <div className="space-y-1">
                    <Label htmlFor="setting-helper-price">Valor por Ajudante (R$)</Label>
                    <Input
                      id="setting-helper-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={settings?.helper_price ?? 125}
                      onChange={(e) => setSettings(prev => prev ? { ...prev, helper_price: Number(e.target.value) } : prev)}
                    />
                    <p className="text-xs text-muted-foreground">Este valor aparece no checkout quando o cliente seleciona ajudantes.</p>
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full mt-4"
                size="lg"
                onClick={handleSaveSettings}
                disabled={savingSettings}
              >
                <Save size={18} className="mr-2" />
                {savingSettings ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: Regiões Atendidas ═══ */}
        <TabsContent value="regioes">
          {loadingRegions ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="max-w-2xl space-y-6">
              {/* Add region input */}
              <div className="flex gap-3">
                <Input
                  placeholder="Nova região..."
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addRegion()}
                />
                <Button onClick={addRegion}>
                  <Plus size={18} className="mr-2" /> Adicionar
                </Button>
              </div>

              {/* Region list */}
              <div className="space-y-2">
                {regions.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                      <MapPin className="text-muted-foreground" size={22} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Nenhuma região cadastrada. Adicione a primeira acima.
                    </p>
                  </div>
                )}

                {regions.map((region) => (
                  <div
                    key={region.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border"
                  >
                    <span
                      className={`text-sm font-medium ${
                        region.active ? 'text-foreground' : 'text-muted-foreground line-through'
                      }`}
                    >
                      {region.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={region.active}
                        onCheckedChange={() => toggleRegionActive(region.id)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {region.active ? 'Ativa' : 'Inativa'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRegion(region.id, region.isNew)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSaveRegions}
                disabled={savingRegions}
              >
                <Save size={18} className="mr-2" />
                {savingRegions ? 'Salvando...' : 'Salvar Regiões'}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: Conta Admin ═══ */}
        <TabsContent value="conta">
          <div className="max-w-2xl space-y-6">
            {/* Card: Alterar Senha */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <KeyRound size={20} className="text-accent" />
                  Alterar Senha
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  E-mail de administrador:{' '}
                  <strong className="text-foreground">{adminEmail ?? '---'}</strong>
                </p>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="pwd-current">Senha atual</Label>
                    <Input
                      id="pwd-current"
                      type="password"
                      autoComplete="current-password"
                      value={pwdCurrent}
                      onChange={(e) => setPwdCurrent(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pwd-new">Nova senha</Label>
                    <Input
                      id="pwd-new"
                      type="password"
                      autoComplete="new-password"
                      value={pwdNew}
                      onChange={(e) => setPwdNew(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="pwd-confirm">Confirmar nova senha</Label>
                    <Input
                      id="pwd-confirm"
                      type="password"
                      autoComplete="new-password"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <Button type="submit" variant="secondary" disabled={pwdSaving}>
                    {pwdSaving ? 'Alterando...' : 'Alterar Senha'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Card: Alterar E-mail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail size={20} className="text-accent" />
                  Alterar E-mail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailChange} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="email-new">Novo e-mail</Label>
                    <Input
                      id="email-new"
                      type="email"
                      autoComplete="email"
                      value={emailNew}
                      onChange={(e) => setEmailNew(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="email-pwd">Senha atual (confirmação)</Label>
                    <Input
                      id="email-pwd"
                      type="password"
                      autoComplete="current-password"
                      value={emailPwd}
                      onChange={(e) => setEmailPwd(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" variant="secondary" disabled={emailSaving}>
                    {emailSaving ? 'Atualizando...' : 'Atualizar E-mail'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
