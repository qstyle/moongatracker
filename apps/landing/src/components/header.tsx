import { useState } from 'react';
import { motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { APP_URL } from '@/lib/constants';

const menuItems = [
  { name: 'Как работает', href: '#how' },
  { name: 'Демо', href: '#demo' },
  { name: 'Интеграции', href: '#integrations' },
  { name: 'Тарифы', href: '#pricing' },
];

export function Header() {
  const [menuState, setMenuState] = useState(false);

  return (
    <header>
      <nav data-state={menuState && 'active'} className="fixed z-20 w-full pt-2">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <motion.div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-6">
            <div className="flex w-full items-center justify-between gap-12 lg:w-auto">
              <a href="/" aria-label="home" className="flex items-center">
                <Logo />
              </a>
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Закрыть меню' : 'Открыть меню'}
                className="relative z-20 -m-2.5 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 scale-0 opacity-0 duration-200" />
              </button>
              <div className="hidden lg:block">
                <ul className="flex gap-8 text-sm">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} className="text-muted-foreground hover:text-foreground block duration-150">
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 border p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      <a href={item.href} className="text-muted-foreground hover:text-foreground block duration-150">
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm">
                  <a href={APP_URL}>Войти</a>
                </Button>
                <Button asChild size="sm">
                  <a href={APP_URL}>Начать бесплатно</a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </nav>
    </header>
  );
}
