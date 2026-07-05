import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CardDto, CardPriority, PRIORITIES } from '@moongatracker/shared-types';
import { RiAttachment2, RiCheckLine, RiDeleteBin6Line, RiFileCopyLine } from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteCard, updateCard } from '../../api/cards';
import { addComment, listComments } from '../../api/comments';
import { fetchActivity, revertActivity } from '../../api/activity';
import { deleteAttachment, listAttachments, uploadAttachment } from '../../api/attachments';
import { useBoardActors } from '../../lib/use-board-actors';
import { Markdown } from '../markdown';
import { ActorAvatar } from './actor-avatar';

export function CardDialog({
  card,
  cardKey,
  onClose,
  onChanged,
}: {
  card: CardDto;
  cardKey: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(card.title);
  const [body, setBody] = useState(card.body ?? '');
  // Start in preview when there's already content to read; empty cards open in edit.
  const [bodyEdit, setBodyEdit] = useState(!(card.body ?? '').trim());
  const [priority, setPriority] = useState<CardPriority | null>(card.priority);
  const [busy, setBusy] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { actors, resolve } = useBoardActors(card.boardId);
  const author = resolve(card.author);
  const assigneeValue = card.assignee
    ? `${card.assignee.type}:${card.assignee.id}`
    : 'none';

  const comments = useQuery({ queryKey: ['comments', card.id], queryFn: () => listComments(card.id) });
  const { data: activities = [] } = useQuery({ queryKey: ['activity', card.id], queryFn: () => fetchActivity(card.id) });
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ['attachments', card.id],
    queryFn: () => listAttachments(card.id),
  });

  useEffect(() => {
    async function onPaste(e: ClipboardEvent) {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((i) => i.type.startsWith('image/'));
      if (!imageItem) return;
      const file = imageItem.getAsFile();
      if (!file) return;
      setUploading(true);
      try {
        await uploadAttachment(card.id, new File([file], `screenshot-${Date.now()}.png`, { type: file.type }));
        await refetchAttachments();
        onChanged();
      } finally {
        setUploading(false);
      }
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [card.id, refetchAttachments, onChanged]);

  async function save() {
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await updateCard(card.id, { title: value, body: body.trim() ? body : null });
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy(true);
    try {
      await deleteCard(card.id);
      onChanged();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPriority(p: CardPriority | null) {
    setPriority(p);
    await updateCard(card.id, { priority: p });
    onChanged();
  }

  async function handleSetAssignee(value: string) {
    if (value === 'none') {
      await updateCard(card.id, { assigneeType: null, assigneeId: null });
    } else {
      const [type, id] = value.split(':');
      await updateCard(card.id, { assigneeType: type, assigneeId: id });
    }
    onChanged();
  }

  function copyLink() {
    const url = `${location.origin}/boards/${card.boardId}/cards/${cardKey}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function postComment() {
    const value = commentBody.trim();
    if (!value) return;
    await addComment(card.id, value);
    setCommentBody('');
    qc.invalidateQueries({ queryKey: ['comments', card.id] });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadAttachment(card.id, file);
      await refetchAttachments();
      onChanged();
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-3xl">
        <SheetHeader className="pr-12">
          <SheetTitle>{cardKey}</SheetTitle>
          <Button type="button" variant="ghost" size="icon-xs" onClick={copyLink} title="Скопировать ссылку на карточку">
            {copied ? <RiCheckLine className="text-emerald-500" /> : <RiFileCopyLine />}
          </Button>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-5 p-4">
            <Input value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">описание</div>
                {body.trim() && (
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setBodyEdit((v) => !v)}>
                    {bodyEdit ? 'Просмотр' : 'Правка'}
                  </Button>
                )}
              </div>
              {bodyEdit ? (
                <Textarea value={body} rows={4} placeholder="Описание… (поддерживается Markdown)" onChange={(e) => setBody(e.target.value)} />
              ) : (
                <div
                  className="min-h-9 cursor-text rounded-md border border-transparent px-1 hover:border-border"
                  onClick={() => setBodyEdit(true)}
                >
                  {body.trim() ? (
                    <Markdown>{body}</Markdown>
                  ) : (
                    <span className="text-sm text-muted-foreground/50">Нет описания</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">приоритет</div>
              <div className="flex flex-wrap gap-1.5">
                {[...PRIORITIES, null].map((p) => (
                  <Badge
                    key={p?.key ?? 'none'}
                    variant={priority === (p?.key ?? null) ? 'default' : 'outline'}
                    style={p ? { borderColor: p.color, color: priority === p.key ? undefined : p.color } : undefined}
                    onClick={() => handleSetPriority(p?.key ?? null)}
                  >
                    {p?.label ?? 'Нет'}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">исполнитель</div>
              <Select value={assigneeValue} onValueChange={handleSetAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Не назначен" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Не назначен</SelectItem>
                  {actors.map((a) => (
                    <SelectItem key={`${a.type}:${a.id}`} value={`${a.type}:${a.id}`}>
                      <span className="flex items-center gap-2">
                        <ActorAvatar actor={a} size="xs" />
                        {a.name ?? (a.type === 'agent' ? 'Агент' : 'Участник')}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              {author && (
                <div className="flex items-center gap-1.5">
                  <span className="uppercase tracking-wider">автор</span>
                  <ActorAvatar actor={author} size="xs" />
                  <span className="text-foreground">{author.name}</span>
                </div>
              )}
              <div className="tabular-nums">
                создано {new Date(card.createdAt).toLocaleDateString('ru')}
                {card.updatedAt !== card.createdAt &&
                  ` · изменено ${new Date(card.updatedAt).toLocaleDateString('ru')}`}
              </div>
            </div>

            <Separator />

            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">вложения</div>
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-1 rounded border border-border bg-muted px-2 py-1">
                      <div
                        className="max-w-35 cursor-pointer truncate text-sm text-foreground hover:underline"
                        onClick={() => window.open(a.url, '_blank')}
                        title={a.filename}
                      >
                        {a.filename}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Удалить вложение"
                        onClick={async () => { await deleteAttachment(a.id); refetchAttachments(); onChanged(); }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                <RiAttachment2 />
                {uploading ? 'Загрузка…' : 'Прикрепить файл'}
              </Button>
            </div>

            <Separator />

            <Tabs defaultValue="comments">
              <TabsList>
                <TabsTrigger value="comments">Комментарии</TabsTrigger>
                <TabsTrigger value="history">История</TabsTrigger>
              </TabsList>

              <TabsContent value="comments">
                <div className="flex flex-col gap-2">
                  {(comments.data ?? []).map((c) => {
                    // Resolve the comment author (name/color) from the board's
                    // actor list, mirroring how the card author is shown.
                    const commentAuthor = resolve({
                      type: c.authorType,
                      id: c.authorId,
                      name: null,
                    });
                    return (
                      <div key={c.id} className="border border-border bg-background px-2.5 py-2">
                        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {commentAuthor && (
                            <>
                              <ActorAvatar actor={commentAuthor} size="xs" />
                              <span className="text-foreground">{commentAuthor.name}</span>
                            </>
                          )}
                          <span className="tabular-nums">{new Date(c.createdAt).toLocaleString('ru-RU')}</span>
                        </div>
                        <Markdown className="break-words">{c.body}</Markdown>
                      </div>
                    );
                  })}
                  {comments.data?.length === 0 && (
                    <div className="text-xs text-muted-foreground/50">пока пусто</div>
                  )}
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <Textarea
                    value={commentBody}
                    rows={2}
                    placeholder="Комментарий…"
                    onChange={(e) => setCommentBody(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                  />
                  <Button type="button" size="sm" onClick={postComment} disabled={!commentBody.trim()}>
                    Отправить
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history">
                <div className="space-y-2">
                  {activities.length === 0 && (
                    <div className="text-sm text-muted-foreground">Нет истории агентских действий</div>
                  )}
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-2 rounded border border-border/50 px-3 py-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#f59e0b' }}>агент</div>
                          <div className="text-sm text-foreground">{a.action}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString('ru')}</div>
                        {a.after && (
                          <div className="text-xs text-muted-foreground">
                            {Object.entries(a.after).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        )}
                      </div>
                      {a.before && a.action !== 'revert' && (
                        <Button variant="ghost" size="sm" onClick={async () => { await revertActivity(a.id); onChanged(); }}>
                          Откатить
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>

        <SheetFooter>
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <RiDeleteBin6Line />
            удалить
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>отмена</Button>
            <Button type="button" size="sm" onClick={save} disabled={busy || !title.trim()}>сохранить</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
