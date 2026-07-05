import { apiFetch, asJson } from './client';
import type {
  NotificationPreferences,
  NotificationPreferencesUpdate,
  TelegramLinkCodeResponse,
  TelegramLinkStatus,
} from '@moongatracker/shared-types';

export function fetchTelegramStatus(): Promise<TelegramLinkStatus> {
  return apiFetch('/api/telegram/link').then((r) =>
    asJson<TelegramLinkStatus>(r),
  );
}

export function createTelegramLinkCode(): Promise<TelegramLinkCodeResponse> {
  return apiFetch('/api/telegram/link-code', { method: 'POST' }).then((r) =>
    asJson<TelegramLinkCodeResponse>(r),
  );
}

export async function unlinkTelegram(): Promise<void> {
  const r = await apiFetch('/api/telegram/link', { method: 'DELETE' });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

export function fetchNotificationPrefs(): Promise<NotificationPreferences> {
  return apiFetch('/api/telegram/preferences').then((r) =>
    asJson<NotificationPreferences>(r),
  );
}

export function updateNotificationPrefs(
  patch: NotificationPreferencesUpdate,
): Promise<NotificationPreferences> {
  return apiFetch('/api/telegram/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  }).then((r) => asJson<NotificationPreferences>(r));
}
