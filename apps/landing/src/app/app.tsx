import ReactLenis from 'lenis/react';
import { StickyCardStack } from '@/components/sticky-card-stack';

export function App() {
  return (
    <ReactLenis root options={{ autoRaf: false, smoothWheel: false }}>
      <StickyCardStack>
        <div className="flex h-full w-full items-center justify-center bg-background text-4xl">1</div>
        <div className="flex h-full w-full items-center justify-center bg-card text-4xl">2</div>
      </StickyCardStack>
    </ReactLenis>
  );
}
export default App;
