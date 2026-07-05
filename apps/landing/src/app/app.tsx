import ReactLenis from 'lenis/react';
import { Header } from '@/components/header';
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
