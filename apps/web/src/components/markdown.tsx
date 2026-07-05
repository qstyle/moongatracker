import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

// Shared markdown styling used by the wiki, canvas notes, card descriptions
// and comments — single source of truth for GFM rendering.
const MD_CLASSES = [
  'max-w-none text-sm leading-relaxed text-foreground',
  '[&_h1]:mb-3 [&_h1]:mt-1 [&_h1]:text-xl [&_h1]:font-semibold',
  '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold',
  '[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:font-semibold',
  '[&_p]:my-2',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_li]:my-0.5',
  '[&_a]:text-primary [&_a]:underline',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs',
  '[&_pre]:my-2 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_table]:my-2 [&_table]:border-collapse',
  '[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left',
  '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
  '[&_hr]:my-4 [&_hr]:border-border',
].join(' ');

export function Markdown({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={cn(MD_CLASSES, className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
