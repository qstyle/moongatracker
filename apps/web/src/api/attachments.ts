import { AttachmentDto } from '@moonga-studio/shared-types';
import { apiFetch, asJson } from './client';

export function listAttachments(cardId: string): Promise<AttachmentDto[]> {
  return apiFetch(`/api/cards/${cardId}/attachments`).then((r) =>
    asJson<AttachmentDto[]>(r),
  );
}

export async function uploadAttachment(
  cardId: string,
  file: File,
): Promise<AttachmentDto> {
  // Step 1: get presigned URL
  const { presignedUrl, attachmentId } = await apiFetch(
    `/api/cards/${cardId}/attachments/presign`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      }),
    },
  ).then((r) => asJson<{ presignedUrl: string; attachmentId: string }>(r));

  // Step 2: upload directly to S3 (no auth header)
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  // Step 3: return a partial shape; caller should refetch list to get presigned GET url
  return {
    id: attachmentId,
    cardId,
    key: '',
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  };
}

export function deleteAttachment(id: string): Promise<void> {
  return apiFetch(`/api/attachments/${id}`, { method: 'DELETE' }).then((r) =>
    asJson<void>(r),
  );
}
