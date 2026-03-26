import logoIcon from '@/assets/logo-icon.png';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

export function SiteFooter() {
  const { displayName } = useSiteSettings();
  return (
    <footer className="bg-primary py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4 min-w-0">
              <img src={logoIcon} alt="" className="h-8 w-8 shrink-0" />
              <span className="font-display text-xl font-bold text-primary-foreground break-words">
                {displayName}
              </span>
            </div>
            <p className="text-primary-foreground/60 text-sm max-w-xs">
              Aluguel de caçambas com entrega rápida, preço justo e descarte ambientalmente responsável.
            </p>
          </div>

          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-4">Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#beneficios" className="text-primary-foreground/60 hover:text-accent transition-colors">Benefícios</a></li>
              <li><a href="#ofertas" className="text-primary-foreground/60 hover:text-accent transition-colors">Ofertas</a></li>
              <li><a href="#tamanhos" className="text-primary-foreground/60 hover:text-accent transition-colors">Tamanhos e Preços</a></li>
              <li><a href="#como-funciona" className="text-primary-foreground/60 hover:text-accent transition-colors">Como Funciona</a></li>
              <li><a href="#contato" className="text-primary-foreground/60 hover:text-accent transition-colors">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-bold text-primary-foreground mb-4">Atendimento</h4>
            <div className="space-y-2 text-sm text-primary-foreground/60">
              <p>Segunda a Sexta: 7h às 18h</p>
              <p>Sábado: 7h às 12h</p>
              <p>Emergência: 24 horas</p>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 text-center">
          <p className="text-sm text-primary-foreground/40">
            © {new Date().getFullYear()} {displayName}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
