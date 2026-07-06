import { Bot } from 'lucide-react';

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-heading font-semibold">
      <Bot className="size-5 text-primary" />
      <span>Moonga Studio</span>
    </span>
  );
}
