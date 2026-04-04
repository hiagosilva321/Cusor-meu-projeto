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
  Tag,
  Trash2,
  Loader2,
  Globe,
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

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  max_uses: number | null;
  current_uses: number;
  description: string | null;
}

interface NewCouponForm {
  code: string;
  discount_percent: string;
  max_uses: string;
  description: string;
}

interface TrustMark { label: string; highlight: boolean }
interface BenefitItem { title: string; description: string }
interface HowitStep { number: string; title: string; description: string }

interface LpFormData {
  hero_badge: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_trust_marks: TrustMark[];
  benefits_title: string;
  benefits_items: BenefitItem[];
  howit_title: string;
  howit_steps: HowitStep[];
  discard_title: string;
  discard_subtitle: string;
  discard_items: string[];
  cta_title: string;
  cta_subtitle: string;
  contact_badge: string;
  contact_title: string;
  contact_subtitle: string;
  business_hours_weekday: string;
  business_hours_saturday: string;
  business_hours_emergency: string;
  sizes_title: string;
  sizes_subtitle: string;
  regions_title: string;
  regions_subtitle: string;
}

const LP_DEFAULTS: LpFormData = {
  hero_badge: '',
  hero_title: '',
  hero_subtitle: '',
  hero_cta_primary: '',
  hero_cta_secondary: '',
  hero_trust_marks: [],
  benefits_title: '',
  benefits_items: [],
  howit_title: '',
  howit_steps: [],
  discard_title: '',
  discard_subtitle: '',
  discard_items: [],
  cta_title: '',
  cta_subtitle: '',
  contact_badge: '',
  contact_title: '',
  contact_subtitle: '',
  business_hours_weekday: '',
  business_hours_saturday: '',
  business_hours_emergency: '',
  sizes_title: '',
  sizes_subtitle: '',
  regions_title: '',
  regions_subtitle: '',
};

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

  /* ─── Tab: Cupons ─── */
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [showNewCouponForm, setShowNewCouponForm] = useState(false);
  const [newCoupon, setNewCoupon] = useState<NewCouponForm>({
    code: '',
    discount_percent: '',
    max_uses: '',
    description: '',
  });

  /* ─── Tab: Landing Page ─── */
  const [lpData, setLpData] = useState<LpFormData>(LP_DEFAULTS);
  const [loadingLp, setLoadingLp] = useState(true);
  const [savingLp, setSavingLp] = useState(false);

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

    async function fetchCoupons() {
      const { data } = await supabase
        .from('coupons')
        .select('id, code, discount_percent, active, max_uses, current_uses, description')
        .order('created_at', { ascending: false });
      if (data) setCoupons(data as Coupon[]);
      setLoadingCoupons(false);
    }

    async function fetchLpContent() {
      const { data } = await supabase.from('site_settings').select('*').limit(1).single();
      if (data) {
        setLpData({
          hero_badge: data.hero_badge ?? '',
          hero_title: data.hero_title ?? '',
          hero_subtitle: data.hero_subtitle ?? '',
          hero_cta_primary: data.hero_cta_primary ?? '',
          hero_cta_secondary: data.hero_cta_secondary ?? '',
          hero_trust_marks: Array.isArray(data.hero_trust_marks) ? (data.hero_trust_marks as unknown as TrustMark[]) : [],
          benefits_title: data.benefits_title ?? '',
          benefits_items: Array.isArray(data.benefits_items) ? (data.benefits_items as unknown as BenefitItem[]) : [],
          howit_title: data.howit_title ?? '',
          howit_steps: Array.isArray(data.howit_steps) ? (data.howit_steps as unknown as HowitStep[]) : [],
          discard_title: data.discard_title ?? '',
          discard_subtitle: data.discard_subtitle ?? '',
          discard_items: Array.isArray(data.discard_items) ? (data.discard_items as unknown as string[]) : [],
          cta_title: data.cta_title ?? '',
          cta_subtitle: data.cta_subtitle ?? '',
          contact_badge: data.contact_badge ?? '',
          contact_title: data.contact_title ?? '',
          contact_subtitle: data.contact_subtitle ?? '',
          business_hours_weekday: data.business_hours_weekday ?? '',
          business_hours_saturday: data.business_hours_saturday ?? '',
          business_hours_emergency: data.business_hours_emergency ?? '',
          sizes_title: data.sizes_title ?? '',
          sizes_subtitle: data.sizes_subtitle ?? '',
          regions_title: data.regions_title ?? '',
          regions_subtitle: data.regions_subtitle ?? '',
        });
      }
      setLoadingLp(false);
    }

    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setAdminEmail(user?.email ?? null);
    }

    fetchSettings();
    fetchRegions();
    fetchCoupons();
    fetchLpContent();
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

  /* ─── Coupons handlers ─── */

  const handleCreateCoupon = async () => {
    const code = newCoupon.code.trim().toUpperCase();
    const percent = parseInt(newCoupon.discount_percent);
    if (!code) { toast.error('Informe o codigo do cupom.'); return; }
    if (!percent || percent < 1 || percent > 50) { toast.error('Percentual deve ser entre 1 e 50.'); return; }

    setSavingCoupon(true);
    const { data, error } = await supabase.from('coupons').insert({
      code,
      discount_percent: percent,
      active: true,
      max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
      current_uses: 0,
      description: newCoupon.description.trim() || null,
    }).select().single();

    if (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('Ja existe um cupom com esse codigo.');
      } else {
        toast.error('Erro ao criar cupom.');
      }
    } else if (data) {
      setCoupons((prev) => [data as Coupon, ...prev]);
      setNewCoupon({ code: '', discount_percent: '', max_uses: '', description: '' });
      setShowNewCouponForm(false);
      toast.success('Cupom criado!');
    }
    setSavingCoupon(false);
  };

  const toggleCouponActive = async (coupon: Coupon) => {
    const newActive = !coupon.active;
    const { error } = await supabase
      .from('coupons')
      .update({ active: newActive })
      .eq('id', coupon.id);
    if (error) {
      toast.error('Erro ao atualizar cupom.');
    } else {
      setCoupons((prev) => prev.map((c) => c.id === coupon.id ? { ...c, active: newActive } : c));
      toast.success(newActive ? 'Cupom ativado.' : 'Cupom desativado.');
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (!confirm(`Excluir cupom ${coupon.code}?`)) return;
    const { error } = await supabase.from('coupons').delete().eq('id', coupon.id);
    if (error) {
      toast.error('Erro ao excluir cupom.');
    } else {
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      toast.success('Cupom excluido.');
    }
  };

  /* ─── Landing Page handlers ─── */

  const handleLpText = (field: keyof LpFormData, value: string) => {
    setLpData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveLp = async () => {
    if (!settings) return;
    setSavingLp(true);
    const { error } = await supabase
      .from('site_settings')
      .update({
        hero_badge: lpData.hero_badge,
        hero_title: lpData.hero_title,
        hero_subtitle: lpData.hero_subtitle,
        hero_cta_primary: lpData.hero_cta_primary,
        hero_cta_secondary: lpData.hero_cta_secondary,
        hero_trust_marks: lpData.hero_trust_marks as unknown as Tables<'site_settings'>['hero_trust_marks'],
        benefits_title: lpData.benefits_title,
        benefits_items: lpData.benefits_items as unknown as Tables<'site_settings'>['benefits_items'],
        howit_title: lpData.howit_title,
        howit_steps: lpData.howit_steps as unknown as Tables<'site_settings'>['howit_steps'],
        discard_title: lpData.discard_title,
        discard_subtitle: lpData.discard_subtitle,
        discard_items: lpData.discard_items as unknown as Tables<'site_settings'>['discard_items'],
        cta_title: lpData.cta_title,
        cta_subtitle: lpData.cta_subtitle,
        contact_badge: lpData.contact_badge,
        contact_title: lpData.contact_title,
        contact_subtitle: lpData.contact_subtitle,
        business_hours_weekday: lpData.business_hours_weekday,
        business_hours_saturday: lpData.business_hours_saturday,
        business_hours_emergency: lpData.business_hours_emergency,
        sizes_title: lpData.sizes_title,
        sizes_subtitle: lpData.sizes_subtitle,
        regions_title: lpData.regions_title,
        regions_subtitle: lpData.regions_subtitle,
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Erro ao salvar conteudo da landing page');
    } else {
      await refreshGlobalSettings();
      toast.success('Conteudo da landing page salvo!');
    }
    setSavingLp(false);
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
          <TabsTrigger value="cupons">Cupons</TabsTrigger>
          <TabsTrigger value="landing">Landing Page</TabsTrigger>
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

        {/* ═══ TAB: Cupons ═══ */}
        <TabsContent value="cupons">
          {loadingCoupons ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="max-w-3xl space-y-6">
              {/* Add coupon button / form */}
              {showNewCouponForm ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tag size={20} className="text-accent" />
                      Novo Cupom
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="coupon-code">Codigo *</Label>
                        <Input
                          id="coupon-code"
                          placeholder="EX: DESCONTO20"
                          value={newCoupon.code}
                          onChange={(e) => setNewCoupon((prev) => ({ ...prev, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                          maxLength={30}
                        />
                        <p className="text-xs text-muted-foreground">Apenas letras e numeros, sem espacos.</p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coupon-percent">Desconto (%) *</Label>
                        <Input
                          id="coupon-percent"
                          type="number"
                          min={1}
                          max={50}
                          placeholder="Ex: 10"
                          value={newCoupon.discount_percent}
                          onChange={(e) => setNewCoupon((prev) => ({ ...prev, discount_percent: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coupon-max-uses">Maximo de usos</Label>
                        <Input
                          id="coupon-max-uses"
                          type="number"
                          min={1}
                          placeholder="Ilimitado se vazio"
                          value={newCoupon.max_uses}
                          onChange={(e) => setNewCoupon((prev) => ({ ...prev, max_uses: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="coupon-desc">Descricao</Label>
                        <Input
                          id="coupon-desc"
                          placeholder="Descricao interna (opcional)"
                          value={newCoupon.description}
                          onChange={(e) => setNewCoupon((prev) => ({ ...prev, description: e.target.value }))}
                          maxLength={200}
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleCreateCoupon} disabled={savingCoupon}>
                        {savingCoupon ? <><Loader2 size={16} className="animate-spin mr-2" /> Criando...</> : <><Save size={16} className="mr-2" /> Criar Cupom</>}
                      </Button>
                      <Button variant="outline" onClick={() => setShowNewCouponForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button onClick={() => setShowNewCouponForm(true)}>
                  <Plus size={18} className="mr-2" /> Adicionar Cupom
                </Button>
              )}

              {/* Coupons table */}
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Codigo</th>
                      <th className="text-left p-3 font-medium">Desconto</th>
                      <th className="text-left p-3 font-medium">Usos / Maximo</th>
                      <th className="text-left p-3 font-medium">Descricao</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12">
                          <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                              <Tag className="text-muted-foreground" size={22} />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Nenhum cupom cadastrado. Crie o primeiro acima.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      coupons.map((coupon) => (
                        <tr key={coupon.id} className="border-t hover:bg-muted/50 transition-colors">
                          <td className="p-3 font-mono font-semibold text-foreground">{coupon.code}</td>
                          <td className="p-3 text-foreground">{coupon.discount_percent}%</td>
                          <td className="p-3 text-muted-foreground">
                            {coupon.current_uses} / {coupon.max_uses ?? 'Ilimitado'}
                          </td>
                          <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">
                            {coupon.description || '--'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={coupon.active}
                                onCheckedChange={() => toggleCouponActive(coupon)}
                              />
                              <span className="text-xs text-muted-foreground">
                                {coupon.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCoupon(coupon)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB: Landing Page ═══ */}
        <TabsContent value="landing">
          {loadingLp ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : (
            <div className="max-w-2xl space-y-6">

              {/* ── Hero Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe size={20} className="text-accent" />
                    Hero Section
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="lp-hero-badge">Badge</Label>
                    <Input
                      id="lp-hero-badge"
                      value={lpData.hero_badge}
                      onChange={(e) => handleLpText('hero_badge', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-hero-title">Titulo</Label>
                    <Input
                      id="lp-hero-title"
                      value={lpData.hero_title}
                      onChange={(e) => handleLpText('hero_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-hero-subtitle">Subtitulo</Label>
                    <Textarea
                      id="lp-hero-subtitle"
                      className="min-h-[80px]"
                      value={lpData.hero_subtitle}
                      onChange={(e) => handleLpText('hero_subtitle', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="lp-hero-cta-primary">CTA Primario</Label>
                      <Input
                        id="lp-hero-cta-primary"
                        value={lpData.hero_cta_primary}
                        onChange={(e) => handleLpText('hero_cta_primary', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lp-hero-cta-secondary">CTA Secundario</Label>
                      <Input
                        id="lp-hero-cta-secondary"
                        value={lpData.hero_cta_secondary}
                        onChange={(e) => handleLpText('hero_cta_secondary', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Trust Marks list */}
                  <div className="space-y-2">
                    <Label>Trust Marks</Label>
                    {lpData.hero_trust_marks.map((tm, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          placeholder="Label"
                          value={tm.label}
                          onChange={(e) => {
                            const items = [...lpData.hero_trust_marks];
                            items[i] = { ...items[i], label: e.target.value };
                            setLpData((prev) => ({ ...prev, hero_trust_marks: items }));
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={tm.highlight}
                            onCheckedChange={(val) => {
                              const items = [...lpData.hero_trust_marks];
                              items[i] = { ...items[i], highlight: val };
                              setLpData((prev) => ({ ...prev, hero_trust_marks: items }));
                            }}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">Destaque</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const items = lpData.hero_trust_marks.filter((_, idx) => idx !== i);
                            setLpData((prev) => ({ ...prev, hero_trust_marks: items }));
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLpData((prev) => ({
                          ...prev,
                          hero_trust_marks: [...prev.hero_trust_marks, { label: '', highlight: false }],
                        }))
                      }
                    >
                      <Plus size={14} className="mr-1" /> Adicionar Trust Mark
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── Benefits Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Beneficios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="lp-benefits-title">Titulo</Label>
                    <Input
                      id="lp-benefits-title"
                      value={lpData.benefits_title}
                      onChange={(e) => handleLpText('benefits_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Itens (max 8)</Label>
                    {lpData.benefits_items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            placeholder="Titulo"
                            value={item.title}
                            onChange={(e) => {
                              const items = [...lpData.benefits_items];
                              items[i] = { ...items[i], title: e.target.value };
                              setLpData((prev) => ({ ...prev, benefits_items: items }));
                            }}
                          />
                          <Input
                            placeholder="Descricao"
                            value={item.description}
                            onChange={(e) => {
                              const items = [...lpData.benefits_items];
                              items[i] = { ...items[i], description: e.target.value };
                              setLpData((prev) => ({ ...prev, benefits_items: items }));
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const items = lpData.benefits_items.filter((_, idx) => idx !== i);
                            setLpData((prev) => ({ ...prev, benefits_items: items }));
                          }}
                          className="text-destructive hover:text-destructive mt-1"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                    {lpData.benefits_items.length < 8 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLpData((prev) => ({
                            ...prev,
                            benefits_items: [...prev.benefits_items, { title: '', description: '' }],
                          }))
                        }
                      >
                        <Plus size={14} className="mr-1" /> Adicionar Beneficio
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── How It Works Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Como Funciona</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="lp-howit-title">Titulo</Label>
                    <Input
                      id="lp-howit-title"
                      value={lpData.howit_title}
                      onChange={(e) => handleLpText('howit_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Passos</Label>
                    {lpData.howit_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex-1 grid grid-cols-[60px_1fr_1fr] gap-2">
                          <Input
                            placeholder="N"
                            value={step.number}
                            onChange={(e) => {
                              const items = [...lpData.howit_steps];
                              items[i] = { ...items[i], number: e.target.value };
                              setLpData((prev) => ({ ...prev, howit_steps: items }));
                            }}
                          />
                          <Input
                            placeholder="Titulo"
                            value={step.title}
                            onChange={(e) => {
                              const items = [...lpData.howit_steps];
                              items[i] = { ...items[i], title: e.target.value };
                              setLpData((prev) => ({ ...prev, howit_steps: items }));
                            }}
                          />
                          <Input
                            placeholder="Descricao"
                            value={step.description}
                            onChange={(e) => {
                              const items = [...lpData.howit_steps];
                              items[i] = { ...items[i], description: e.target.value };
                              setLpData((prev) => ({ ...prev, howit_steps: items }));
                            }}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const items = lpData.howit_steps.filter((_, idx) => idx !== i);
                            setLpData((prev) => ({ ...prev, howit_steps: items }));
                          }}
                          className="text-destructive hover:text-destructive mt-1"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLpData((prev) => ({
                          ...prev,
                          howit_steps: [...prev.howit_steps, { number: String(prev.howit_steps.length + 1).padStart(2, '0'), title: '', description: '' }],
                        }))
                      }
                    >
                      <Plus size={14} className="mr-1" /> Adicionar Passo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── What To Discard Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">O Que Descartar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="lp-discard-title">Titulo</Label>
                      <Input
                        id="lp-discard-title"
                        value={lpData.discard_title}
                        onChange={(e) => handleLpText('discard_title', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="lp-discard-subtitle">Subtitulo</Label>
                      <Input
                        id="lp-discard-subtitle"
                        value={lpData.discard_subtitle}
                        onChange={(e) => handleLpText('discard_subtitle', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Itens</Label>
                    {lpData.discard_items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          className="flex-1"
                          value={item}
                          onChange={(e) => {
                            const items = [...lpData.discard_items];
                            items[i] = e.target.value;
                            setLpData((prev) => ({ ...prev, discard_items: items }));
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const items = lpData.discard_items.filter((_, idx) => idx !== i);
                            setLpData((prev) => ({ ...prev, discard_items: items }));
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLpData((prev) => ({ ...prev, discard_items: [...prev.discard_items, ''] }))
                      }
                    >
                      <Plus size={14} className="mr-1" /> Adicionar Item
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* ── CTA Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">CTA</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="lp-cta-title">Titulo</Label>
                    <Input
                      id="lp-cta-title"
                      value={lpData.cta_title}
                      onChange={(e) => handleLpText('cta_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-cta-subtitle">Subtitulo</Label>
                    <Input
                      id="lp-cta-subtitle"
                      value={lpData.cta_subtitle}
                      onChange={(e) => handleLpText('cta_subtitle', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Contact Form Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Formulario de Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="lp-contact-badge">Badge</Label>
                    <Input
                      id="lp-contact-badge"
                      value={lpData.contact_badge}
                      onChange={(e) => handleLpText('contact_badge', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-contact-title">Titulo</Label>
                    <Input
                      id="lp-contact-title"
                      value={lpData.contact_title}
                      onChange={(e) => handleLpText('contact_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-contact-subtitle">Subtitulo</Label>
                    <Input
                      id="lp-contact-subtitle"
                      value={lpData.contact_subtitle}
                      onChange={(e) => handleLpText('contact_subtitle', e.target.value)}
                    />
                  </div>
                  <hr className="my-2" />
                  <p className="text-sm font-medium text-foreground">Horarios de Atendimento</p>
                  <div className="space-y-1">
                    <Label htmlFor="lp-hours-weekday">Seg a Sex</Label>
                    <Input
                      id="lp-hours-weekday"
                      value={lpData.business_hours_weekday}
                      onChange={(e) => handleLpText('business_hours_weekday', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-hours-saturday">Sabado</Label>
                    <Input
                      id="lp-hours-saturday"
                      value={lpData.business_hours_saturday}
                      onChange={(e) => handleLpText('business_hours_saturday', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-hours-emergency">Emergencia</Label>
                    <Input
                      id="lp-hours-emergency"
                      value={lpData.business_hours_emergency}
                      onChange={(e) => handleLpText('business_hours_emergency', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Sizes Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tamanhos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="lp-sizes-title">Titulo</Label>
                    <Input
                      id="lp-sizes-title"
                      value={lpData.sizes_title}
                      onChange={(e) => handleLpText('sizes_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-sizes-subtitle">Subtitulo</Label>
                    <Input
                      id="lp-sizes-subtitle"
                      value={lpData.sizes_subtitle}
                      onChange={(e) => handleLpText('sizes_subtitle', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Regions Section ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Regioes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="lp-regions-title">Titulo</Label>
                    <Input
                      id="lp-regions-title"
                      value={lpData.regions_title}
                      onChange={(e) => handleLpText('regions_title', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lp-regions-subtitle">Subtitulo</Label>
                    <Input
                      id="lp-regions-subtitle"
                      value={lpData.regions_subtitle}
                      onChange={(e) => handleLpText('regions_subtitle', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSaveLp}
                disabled={savingLp}
              >
                <Save size={18} className="mr-2" />
                {savingLp ? 'Salvando...' : 'Salvar Landing Page'}
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
