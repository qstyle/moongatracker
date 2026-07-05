import ReactLenis from 'lenis/react';
import { Header } from '@/components/header';
import { DotGridCanvas } from '@/components/dot-grid-canvas';
import { StackNav } from '@/components/stack-nav';
import { StickyCardStack } from '@/components/sticky-card-stack';
import { HeroCard } from '@/components/hero-section';
import { HowItWorksCard } from '@/components/how-it-works-section';
import { DemoCard } from '@/components/demo-section';
import { IntegrationsCard } from '@/components/integrations-card';
import { PricingCard } from '@/components/pricing-section';

export function App() {
  return (
    <>
      {/* Глобальный фон: тёмная подложка + дышащая dot-grid, видна сквозь прозрачные карточки */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-background">
        <DotGridCanvas className="absolute inset-0 h-full w-full" />
      </div>
      <ReactLenis root options={{ autoRaf: false, smoothWheel: false }}>
        <Header />
        <StickyCardStack>
          <HeroCard />
          <HowItWorksCard />
          <DemoCard />
          <IntegrationsCard />
          <PricingCard />
        </StickyCardStack>
        {/* Единая навигация: «Назад» скрыта на первом экране, «Листайте вниз» — на последнем */}
        <StackNav total={5} />
      </ReactLenis>
    </>
  );
}

export default App;
