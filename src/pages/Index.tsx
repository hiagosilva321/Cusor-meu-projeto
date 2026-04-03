import { SiteHeader } from '@/components/landing/SiteHeader';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { SizesSection } from '@/components/landing/SizesSection';
// OffersSection removida — conflitava com Tamanhos (precos duplicados)
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { RegionsSection } from '@/components/landing/RegionsSection';
import { WhatToDiscardSection } from '@/components/landing/WhatToDiscardSection';
import { ContactFormSection } from '@/components/landing/ContactFormSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';

const Index = () => {
  return (
    <div className="min-h-screen bg-[#0a1628] text-slate-100">
      <SiteHeader />
      <HeroSection />
      <HowItWorksSection />
      <SizesSection />
      <BenefitsSection />
      <RegionsSection />
      <WhatToDiscardSection />
      <ContactFormSection />
      <CtaSection />
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Index;
