import { useEffect, useRef, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  RiAddLine,
  RiDeleteBin6Line,
  RiBookOpenLine,
  RiFileTextLine,
  RiBold,
  RiItalic,
  RiH2,
  RiListUnordered,
  RiListOrdered,
  RiDoubleQuotesL,
  RiCodeLine,
  RiLink,
} from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Markdown } from '../components/markdown';
import {
  fetchWikiTree,
  fetchWikiPage,
  seedWiki,
  createWikiSection,
  deleteWikiSection,
  createWikiPage,
  updateWikiPage,
  deleteWikiPage,
} from '../api/wiki';

type Adding = { kind: 'section' } | { kind: 'page'; sectionId: string } | null;

export function WikiPage() {
  const [, params] = useRoute('/projects/:projectId/wiki');
  const projectId = params?.projectId ?? '';
  const queryClient = useQueryClient();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Adding>(null);
  const [draftName, setDraftName] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const { data: tree = [], isLoading } = useQuery({
    queryKey: ['wiki', projectId],
    queryFn: () => fetchWikiTree(projectId),
    enabled: !!projectId,
  });

  const { data: page } = useQuery({
    queryKey: ['wiki-page', selectedPageId],
    queryFn: () => fetchWikiPage(selectedPageId!),
    enabled: !!selectedPageId,
  });

  // Авто-выбор первой страницы, когда дерево загрузилось и ничего не выбрано.
  useEffect(() => {
    if (selectedPageId) return;
    const first = tree.flatMap((s) => s.pages)[0];
    if (first) setSelectedPageId(first.id);
  }, [tree, selectedPageId]);

  // Синхронизируем черновик редактора при смене страницы.
  useEffect(() => {
    if (page) {
      setDraftTitle(page.title);
      setDraftBody(page.body);
    }
  }, [page]);

  const refreshTree = () =>
    queryClient.invalidateQueries({ queryKey: ['wiki', projectId] });

  async function onSeed() {
    await seedWiki(projectId);
    await refreshTree();
  }

  async function submitAdd() {
    const name = draftName.trim();
    if (!name || !adding) return;
    if (adding.kind === 'section') {
      await createWikiSection(projectId, name);
    } else {
      const created = await createWikiPage(projectId, adding.sectionId, name);
      setSelectedPageId(created.id);
    }
    setDraftName('');
    setAdding(null);
    await refreshTree();
  }

  async function onDeleteSection(sectionId: string, title: string) {
    if (!confirm(`Удалить раздел «${title}» со всеми страницами?`)) return;
    await deleteWikiSection(sectionId);
    setSelectedPageId(null);
    await refreshTree();
  }

  async function onDeletePage(pageId: string, title: string) {
    if (!confirm(`Удалить страницу «${title}»?`)) return;
    await deleteWikiPage(pageId);
    if (selectedPageId === pageId) setSelectedPageId(null);
    await refreshTree();
  }

  async function onSave() {
    if (!selectedPageId) return;
    setSaving(true);
    try {
      await updateWikiPage(selectedPageId, {
        title: draftTitle.trim() || 'Без названия',
        body: draftBody,
      });
      await Promise.all([
        refreshTree(),
        queryClient.invalidateQueries({
          queryKey: ['wiki-page', selectedPageId],
        }),
      ]);
    } finally {
      setSaving(false);
    }
  }

  // --- Минимальный markdown-редактор: вставка разметки по выделению ---
  function applyEdit(
    transform: (sel: { value: string; start: number; end: number }) => {
      value: string;
      start: number;
      end: number;
    },
  ) {
    const ta = bodyRef.current;
    if (!ta) return;
    const next = transform({
      value: draftBody,
      start: ta.selectionStart,
      end: ta.selectionEnd,
    });
    setDraftBody(next.value);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(next.start, next.end);
    });
  }

  function wrap(marker: string, placeholder: string) {
    applyEdit(({ value, start, end }) => {
      const selected = value.slice(start, end) || placeholder;
      const value2 =
        value.slice(0, start) + marker + selected + marker + value.slice(end);
      const s = start + marker.length;
      return { value: value2, start: s, end: s + selected.length };
    });
  }

  function prefixLines(prefix: string | ((i: number) => string)) {
    applyEdit(({ value, start, end }) => {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const block = value.slice(lineStart, end);
      const newBlock = block
        .split('\n')
        .map((l, i) => (typeof prefix === 'function' ? prefix(i) : prefix) + l)
        .join('\n');
      const value2 = value.slice(0, lineStart) + newBlock + value.slice(end);
      return { value: value2, start: lineStart, end: lineStart + newBlock.length };
    });
  }

  function insertLink() {
    applyEdit(({ value, start, end }) => {
      const text = value.slice(start, end) || 'текст';
      const snippet = `[${text}](url)`;
      const value2 = value.slice(0, start) + snippet + value.slice(end);
      const urlStart = start + text.length + 3;
      return { value: value2, start: urlStart, end: urlStart + 3 };
    });
  }

  if (!projectId)
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Проект не выбран
      </div>
    );

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center animate-pulse text-sm uppercase tracking-wider text-muted-foreground">
        загрузка…
      </div>
    );

  const isEmpty = tree.length === 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Левая панель: разделы и страницы */}
      <div className="flex w-64 shrink-0 flex-col border-r border-border bg-background">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <RiBookOpenLine size={15} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground">
            Вики
          </span>
        </div>
        <ScrollArea className="flex-1 py-2">
          {tree.map((section) => (
            <div key={section.id} className="mb-2">
              <div className="group flex items-center justify-between px-3 py-1">
                <span className="truncate text-sm font-semibold text-foreground">
                  {section.title}
                </span>
                <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Новая страница"
                    onClick={() => {
                      setAdding({ kind: 'page', sectionId: section.id });
                      setDraftName('');
                    }}
                  >
                    <RiAddLine size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Удалить раздел"
                    onClick={() => onDeleteSection(section.id, section.title)}
                  >
                    <RiDeleteBin6Line size={13} />
                  </Button>
                </div>
              </div>
              <div className="ml-3 border-l border-border/40 pl-2">
                {section.pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPageId(p.id)}
                    className={[
                      'flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors',
                      selectedPageId === p.id
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    ].join(' ')}
                  >
                    <RiFileTextLine size={11} className="shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </button>
                ))}
                {adding?.kind === 'page' &&
                  adding.sectionId === section.id && (
                    <div className="py-1 pr-1">
                      <Input
                        autoFocus
                        value={draftName}
                        placeholder="Название страницы"
                        onChange={(e) => setDraftName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitAdd();
                          if (e.key === 'Escape') setAdding(null);
                        }}
                      />
                    </div>
                  )}
              </div>
            </div>
          ))}

          {adding?.kind === 'section' ? (
            <div className="px-3 py-1">
              <Input
                autoFocus
                value={draftName}
                placeholder="Название раздела"
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitAdd();
                  if (e.key === 'Escape') setAdding(null);
                }}
              />
            </div>
          ) : (
            <div className="px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAdding({ kind: 'section' });
                  setDraftName('');
                }}
              >
                + Раздел
              </Button>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Правая панель: содержимое страницы */}
      <div className="flex-1 overflow-hidden">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              В этом проекте ещё нет вики.
            </p>
            <Button onClick={onSeed}>Создать стартовый набор</Button>
          </div>
        ) : !selectedPageId || !page ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Выберите страницу слева
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <span className="truncate text-sm font-semibold text-foreground">
                {page.title}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Удалить страницу"
                onClick={() => onDeletePage(page.id, page.title)}
              >
                <RiDeleteBin6Line size={14} />
              </Button>
            </div>
            <Tabs defaultValue="preview" className="flex flex-1 flex-col overflow-hidden">
              <div className="border-b border-border px-6 py-2">
                <TabsList>
                  <TabsTrigger value="preview">Просмотр</TabsTrigger>
                  <TabsTrigger value="edit">Редактор</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="preview" className="flex-1 overflow-auto px-6 py-4">
                {page.body.trim() ? (
                  <Markdown>{page.body}</Markdown>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Страница пуста. Откройте «Редактор», чтобы добавить текст.
                  </p>
                )}
              </TabsContent>

              <TabsContent
                value="edit"
                className="flex flex-1 flex-col gap-3 overflow-hidden px-6 py-4"
              >
                <Input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Заголовок страницы"
                />
                <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-border p-1">
                  <Button variant="ghost" size="icon-sm" title="Жирный" onClick={() => wrap('**', 'текст')}>
                    <RiBold size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Курсив" onClick={() => wrap('*', 'текст')}>
                    <RiItalic size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Код" onClick={() => wrap('`', 'код')}>
                    <RiCodeLine size={15} />
                  </Button>
                  <span className="mx-1 h-4 w-px bg-border" />
                  <Button variant="ghost" size="icon-sm" title="Заголовок" onClick={() => prefixLines('## ')}>
                    <RiH2 size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Маркированный список" onClick={() => prefixLines('- ')}>
                    <RiListUnordered size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Нумерованный список" onClick={() => prefixLines((i) => `${i + 1}. `)}>
                    <RiListOrdered size={15} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Цитата" onClick={() => prefixLines('> ')}>
                    <RiDoubleQuotesL size={15} />
                  </Button>
                  <span className="mx-1 h-4 w-px bg-border" />
                  <Button variant="ghost" size="icon-sm" title="Ссылка" onClick={insertLink}>
                    <RiLink size={15} />
                  </Button>
                </div>
                <Textarea
                  ref={bodyRef}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Текст в формате Markdown…"
                  className="flex-1 resize-none font-mono text-sm"
                />
                <div className="flex justify-end">
                  <Button onClick={onSave} disabled={saving}>
                    {saving ? 'Сохранение…' : 'Сохранить'}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
