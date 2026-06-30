import { ActivityDto } from '@moongatracker/shared-types';
import { apiFetch, asJson } from './client';

export function fetchActivity(cardId: string): Promise<ActivityDto[]> {
  return apiFetch(`/api/cards/${cardId}/activity`).then((r) =>
    asJson<ActivityDto[]>(r),
  );
}

export function revertActivity(activityId: string): Promise<void> {
  return apiFetch(`/api/activity/${activityId}/revert`, {
    method: 'POST',
  }).then((r) => asJson<void>(r));
}
