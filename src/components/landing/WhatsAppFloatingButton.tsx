import { MessageCircle } from 'lucide-react';
import { useWhatsApp } from '@/contexts/WhatsAppContext';

export function WhatsAppFloatingButton() {
  const { getWhatsAppUrl, trackClick, available, loading } = useWhatsApp();

  if (loading || !available) return null;

  return (
    <a
      href={getWhatsAppUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => trackClick(e, 'flutuante')}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-whatsapp rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 whatsapp-float"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="text-whatsapp-foreground" size={28} />
    </a>
  );
}
