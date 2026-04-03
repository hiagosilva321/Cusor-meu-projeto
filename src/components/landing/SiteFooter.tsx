import logoIcon from '@/assets/logo-icon.png';
import { useSiteSettings } from '@/hooks/use-site-settings';
import { Phone, Mail, MapPin } from 'lucide-react';

export function SiteFooter() {
  const { settings } = useSiteSettings();
  const siteName = settings?.site_name || 'CaçambaJá';
  const telefone = settings?.telefone_principal;
  const email = settings?.email_contato;
  const endereco = settings?.endereco_empresa;

  return (
    <footer className="py-10" style={{ background: '#010c2c' }}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Logo + Nome */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <img src={logoIcon} alt="Logo" className="h-6 w-6" />
              <span className="font-display text-sm font-bold" style={{ color: '#ffe8cb' }}>{siteName}</span>
            </div>
            <p className="text-[11px]" style={{ color: '#514533' }}>
              © {new Date().getFullYear()} {siteName}. Todos os direitos reservados.
            </p>
          </div>

          {/* Contato */}
          {(telefone || email) && (
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#ffe8cb' }}>Contato</span>
              {telefone && (
                <a href={`tel:${telefone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-xs transition-colors hover:text-amber-400" style={{ color: '#7a6d5c' }}>
                  <Phone size={12} /> {telefone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="flex items-center gap-2 text-xs transition-colors hover:text-amber-400" style={{ color: '#7a6d5c' }}>
                  <Mail size={12} /> {email}
                </a>
              )}
            </div>
          )}

          {/* Endereço */}
          {endereco && (
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#ffe8cb' }}>Endereço</span>
              <p className="flex items-start gap-2 text-xs" style={{ color: '#7a6d5c' }}>
                <MapPin size={12} className="shrink-0 mt-0.5" /> {endereco}
              </p>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
