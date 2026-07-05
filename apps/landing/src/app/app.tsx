import ReactLenis from 'lenis/react';
import { Header } from '@/components/header';
import { DotGridCanvas } from '@/components/dot-grid-canvas';
import { StickyCardStack } from '@/components/sticky-card-stack';
import { HeroCard } from '@/components/hero-section';
import { HowItWorksCard } from '@/components/how-it-works-section';
import { DemoCard } from '@/components/demo-section';
import { IntegrationsCard } from '@/components/integrations-card';
import { PricingCard } from '@/components/pricing-section';

export function App() {
  return (
    <>
      <Header />
      {/* Глобальный фон: тёмная подложка + дышащая dot-grid, видна сквозь прозрачные карточки */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-background">
        <DotGridCanvas className="absolute inset-0 h-full w-full" />
      </div>
      <ReactLenis root options={{ autoRaf: false, smoothWheel: false }}>
        <StickyCardStack>
          <HeroCard />
          <HowItWorksCard />
          <DemoCard />
          <IntegrationsCard />
          <PricingCard />
        </StickyCardStack>
      </ReactLenis>
    </>
  );
}

export default App;
