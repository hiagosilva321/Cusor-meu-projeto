import { useEffect, useState, FormEvent } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { mapSupabaseAuthError } from '@/lib/auth-errors';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export default function AdminSettings() {
  const { refetch: refetchSiteBranding } = useSiteSettings();
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);

  const [emailNew, setEmailNew] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .order('id', { ascending: true })
        .limit(1)
        .single();
      if (data) setSettings(data);
      const { data: { user } } = await supabase.auth.getUser();
      setAdminEmail(user?.email ?? null);
      setLoading(false);
    }
    fetch();
  }, []);

  const handleChange = (field: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('site_settings')
      .update({
        site_name: settings.site_name,
        telefone_principal: settings.telefone_principal,
        whatsapp_principal: settings.whatsapp_principal,
        endereco_empresa: settings.endereco_empresa,
        email_contato: settings.email_contato,
      })
      .eq('id', settings.id)
      .select('id, site_name')
      .maybeSingle();

    if (error) {
      toast.error(error.message || 'Erro ao salvar configurações');
    } else if (!data) {
      toast.error('Nenhuma linha atualizada. Verifique permissões (RLS) ou o id em site_settings.');
    } else {
      toast.success('Configurações salvas! A página inicial atualiza automaticamente.');
      try {
        localStorage.setItem('cacamba_site_settings_rev', String(Date.now()));
      } catch {
        /* privado */
      }
      try {
        const bc = new BroadcastChannel('cacamba-site-settings');
        bc.postMessage({ ok: true });
        bc.close();
      } catch {
        /* */
      }
      await refetchSiteBranding();
    }
    setSaving(false);
  };

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
      toast.success('Senha alterada! Use a nova senha no próximo login.');
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error(mapSupabaseAuthError(e.message || ''));
    } finally {
      setPwdSaving(false);
    }
  };

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
        'E-mail de login atualizado. Se o Supabase exigir confirmação, abra a mensagem no novo e-mail. Pode precisar de voltar a entrar.',
        { duration: 8000 },
      );
      setEmailNew('');
      setEmailPwd('');
      const { data: { user } } = await supabase.auth.getUser();
      setAdminEmail(user?.email ?? next);
    } catch (err: unknown) {
      const ex = err as { message?: string };
      toast.error(mapSupabaseAuthError(ex.message || ''));
    } finally {
      setEmailSaving(false);
    }
  };

  if (loading) return <AdminLayout title="Configurações"><p>Carregando...</p></AdminLayout>;

  return (
    <AdminLayout title="Configurações do Site">
      <div className="max-w-2xl space-y-8">
        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <KeyRound size={20} className="text-accent" />
            Conta do administrador
          </h3>
          <p className="text-sm text-muted-foreground">
            E-mail com que entra no painel: <strong className="text-foreground">{adminEmail ?? '—'}</strong>
          </p>

          <form onSubmit={handlePasswordChange} className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium text-foreground">Alterar senha de login</p>
            <div>
              <Label htmlFor="pwd-current">Senha atual</Label>
              <Input
                id="pwd-current"
                type="password"
                autoComplete="current-password"
                value={pwdCurrent}
                onChange={(e) => setPwdCurrent(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="pwd-new">Nova senha</Label>
              <Input
                id="pwd-new"
                type="password"
                autoComplete="new-password"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                className="mt-1"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="pwd-confirm">Confirmar nova senha</Label>
              <Input
                id="pwd-confirm"
                type="password"
                autoComplete="new-password"
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
                className="mt-1"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={pwdSaving}>
              {pwdSaving ? 'A guardar…' : 'Guardar nova senha'}
            </Button>
          </form>

          <form onSubmit={handleEmailChange} className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail size={16} />
              Alterar e-mail de login
            </p>
            <div>
              <Label htmlFor="email-new">Novo e-mail</Label>
              <Input
                id="email-new"
                type="email"
                autoComplete="email"
                value={emailNew}
                onChange={(e) => setEmailNew(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="email-pwd">Senha atual (confirmação)</Label>
              <Input
                id="email-pwd"
                type="password"
                autoComplete="current-password"
                value={emailPwd}
                onChange={(e) => setEmailPwd(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <Button type="submit" variant="secondary" disabled={emailSaving}>
              {emailSaving ? 'A atualizar…' : 'Atualizar e-mail de login'}
            </Button>
          </form>
        </div>

        <div className="p-6 rounded-xl bg-card border shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold text-foreground">Dados da Empresa</h3>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome do Site</label>
            <Input value={settings?.site_name || ''} onChange={(e) => handleChange('site_name', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Telefone Principal</label>
            <Input value={settings?.telefone_principal || ''} onChange={(e) => handleChange('telefone_principal', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">WhatsApp Principal</label>
            <Input value={settings?.whatsapp_principal || ''} onChange={(e) => handleChange('whatsapp_principal', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Endereço da Empresa</label>
            <Input value={settings?.endereco_empresa || ''} onChange={(e) => handleChange('endereco_empresa', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">E-mail de Contato (site público)</label>
            <Input value={settings?.email_contato || ''} onChange={(e) => handleChange('email_contato', e.target.value)} />
          </div>
        </div>

        <Button className="w-full" size="lg" onClick={handleSave} disabled={saving}>
          <Save size={18} className="mr-2" />
          {saving ? 'Salvando...' : 'Salvar Configurações do Site'}
        </Button>
      </div>
    </AdminLayout>
  );
}
