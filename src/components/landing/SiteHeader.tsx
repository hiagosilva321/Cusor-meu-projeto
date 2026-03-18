import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import logoIcon from '@/assets/logo-icon.png';

const navLinks = [
  { label: 'Benefícios', href: '#beneficios' },
  { label: 'Ofertas', href: '#ofertas' },
  { label: 'Tamanhos', href: '#tamanhos' },
  { label: 'Como Funciona', href: '#como-funciona' },
  { label: 'Contato', href: '#contato' },
];

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-2">
          <img src={logoIcon} alt="Logo" className="h-8 w-8" />
          <span className="font-display text-xl font-bold text-foreground">
            Caçamba<span className="text-accent">Já</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
          {available && (
            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
              <Button variant="whatsapp" size="default">
                WhatsApp
              </Button>
            </a>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-b shadow-lg">
          <nav className="container flex flex-col gap-4 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-medium text-foreground hover:text-accent transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {available && (
              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={trackClick}>
                <Button variant="whatsapp" size="lg" className="w-full">
                  Falar no WhatsApp
                </Button>
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
