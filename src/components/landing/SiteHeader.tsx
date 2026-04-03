import { useState, useEffect } from 'react';
import { Menu, X, MessageCircle } from 'lucide-react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';
import { useSiteSettings } from '@/hooks/use-site-settings';
import logoIcon from '@/assets/logo-icon.png';

const navLinks = [
  { label: 'Preços', href: '#tamanhos' },
  { label: 'Como Funciona', href: '#como-funciona' },
  { label: 'Pedir', href: '#contato' },
];

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { getWhatsAppUrl, trackClick, available } = useWhatsApp();
  const { settings } = useSiteSettings();
  const siteName = settings?.site_name || 'CaçambaJá';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#0a1628]/80 backdrop-blur-xl shadow-lg shadow-black/10 border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="container flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-2">
          <img src={logoIcon} alt="Logo" className="h-7 w-7" />
          <span className="font-display text-lg font-bold text-white">{siteName}</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          {available && (
            <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={(e) => trackClick(e, 'header')}>
              <span className="inline-flex items-center gap-2 bg-[#1FAD4E] hover:bg-[#18943f] text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
                <MessageCircle size={16} strokeWidth={2.5} />
                WhatsApp
              </span>
            </a>
          )}
        </nav>

        <button
          className="md:hidden p-2 text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#0a1628]/95 backdrop-blur-xl border-b border-white/5">
          <nav className="container flex flex-col gap-4 py-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-medium text-slate-300 hover:text-white transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {available && (
              <a href={getWhatsAppUrl()} target="_blank" rel="noopener noreferrer" onClick={(e) => trackClick(e, 'header')}>
                <span className="flex items-center justify-center gap-2 bg-[#1FAD4E] text-white rounded-lg px-4 py-3 text-base font-semibold w-full">
                  <MessageCircle size={18} />
                  Falar no WhatsApp
                </span>
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
