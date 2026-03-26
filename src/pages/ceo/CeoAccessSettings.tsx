import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { apiFetchJson } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, ArrowLeft } from 'lucide-react';

export default function CeoAccessSettings() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    if (newPw !== newPw2) {
      setPwErr('As novas senhas não coincidem.');
      return;
    }
    setPwSubmitting(true);
    try {
      await apiFetchJson<{ message?: string }>('ceo-auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setPwMsg('Senha atualizada. A recarregar…');
      setCurrentPw('');
      setNewPw('');
      setNewPw2('');
      window.setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Erro ao alterar a senha.');
    } finally {
      setPwSubmitting(false);
    }
  }

  return (
    <>
      <div className="mb-6 max-w-2xl">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-1 text-muted-foreground" asChild>
          <Link to="/hashadmin1">
            <ArrowLeft size={16} />
            Voltar à visão estratégica
          </Link>
        </Button>
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Configurações de acesso</p>
          <p>
            Aqui altera apenas a <strong className="text-foreground">senha deste painel CEO</strong> (rota{' '}
            <code className="text-xs">/hashadmin1</code>). É independente do login do admin em{' '}
            <code className="text-xs">/admin</code>.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-card border shadow-sm p-5 max-w-lg">
        <h2 className="font-display text-lg font-bold text-foreground mb-1 flex items-center gap-2">
          <KeyRound size={18} className="opacity-70" />
          Alterar senha do painel CEO
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          O valor é guardado na API (<code className="text-[11px]">CEO_PANEL_PASSWORD</code> em{' '}
          <code className="text-[11px]">api/.env</code> no servidor). Depois de gravar, voltará ao ecrã de entrada.
        </p>
        <form onSubmit={handleChangePassword} className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="ceo-cur-pw">Senha atual</Label>
            <Input
              id="ceo-cur-pw"
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              disabled={pwSubmitting}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ceo-new-pw">Nova senha (mín. 8 caracteres)</Label>
            <Input
              id="ceo-new-pw"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              disabled={pwSubmitting}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ceo-new-pw2">Confirmar nova senha</Label>
            <Input
              id="ceo-new-pw2"
              type="password"
              autoComplete="new-password"
              value={newPw2}
              onChange={(e) => setNewPw2(e.target.value)}
              disabled={pwSubmitting}
              required
              minLength={8}
            />
          </div>
          {pwErr && <p className="text-sm text-destructive">{pwErr}</p>}
          {pwMsg && <p className="text-sm text-green-700 dark:text-green-400">{pwMsg}</p>}
          <Button type="submit" variant="secondary" disabled={pwSubmitting} className="w-fit">
            {pwSubmitting ? 'A gravar…' : 'Alterar senha'}
          </Button>
        </form>
      </div>
    </>
  );
}
