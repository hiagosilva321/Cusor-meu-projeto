import { useEffect } from 'react';
import { SitePageTitle } from '@/components/landing/SitePageTitle';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { HeroSection } from '@/components/landing/HeroSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { OffersSection } from '@/components/landing/OffersSection';
import { SizesSection } from '@/components/landing/SizesSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { TrackingSection } from '@/components/landing/TrackingSection';
import { SocialProofSection } from '@/components/landing/SocialProofSection';
import { WhatToDiscardSection } from '@/components/landing/WhatToDiscardSection';
import { RegionsSection } from '@/components/landing/RegionsSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { ContactFormSection } from '@/components/landing/ContactFormSection';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { WhatsAppFloatingButton } from '@/components/landing/WhatsAppFloatingButton';

const Index = () => {
  const { refetch } = useSiteSettings();

  /** Ao entrar na página principal (vindo do admin ou F5), volta a ler o nome do site na BD. */
  useEffect(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-background">
      <SitePageTitle />
      <SiteHeader />
      <HeroSection />
      <BenefitsSection />
      <OffersSection />
      <SizesSection />
      <HowItWorksSection />
      <TrackingSection />
      <SocialProofSection />
      <WhatToDiscardSection />
      <RegionsSection />
      <CtaSection />
      <ContactFormSection />
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default Index;
