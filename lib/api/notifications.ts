import type { NotificationItem } from '@/lib/api/types';
import { listMockNotifications } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';

export async function listNotifications(token?: string | null): Promise<NotificationItem[]> {
  return libraryRequest('/api/v1/notifications', {
    fallback: listMockNotifications,
    method: 'GET',
    token,
  }).then((payload: any) => {
    if (Array.isArray(payload?.items)) {
      return payload.items.map((item: any) => ({
        body: item.body ?? item.message ?? '',
        id: String(item.id),
        kind: item.kind ?? 'reminder',
        title: item.title ?? '消息',
      }));
    }

    return listMockNotifications();
  });
}
