import { useState } from 'react';
import { RiMenuLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/brand/logo';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Backdrop for the mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar with hamburger — hidden on md+ */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Открыть меню"
            onClick={() => setMobileOpen(true)}
          >
            <RiMenuLine />
          </Button>
          <div className="flex items-center gap-1.5">
            <LogoMark className="size-5" />
            <span className="text-xs font-semibold tracking-tight text-foreground">
              <span className="text-primary">m</span>oonga tracker
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
