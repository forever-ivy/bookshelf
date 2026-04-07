import type { NotificationItem } from '@/lib/api/types';
import { listMockNotifications } from '@/lib/api/mock';
import { LibraryApiError, libraryFetchJson, libraryRequest } from '@/lib/api/client';

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

export async function dismissNotification(notificationId: string, token?: string | null) {
  const normalizedNotificationId = notificationId.trim();
  if (!normalizedNotificationId) {
    throw new LibraryApiError('notification_id_required', {
      code: 'notification_id_required',
      status: 400,
    });
  }

  return libraryFetchJson<{ notification_id?: string; notificationId?: string; ok?: boolean }>(
    '/api/v1/notifications/dismissals',
    {
      body: JSON.stringify({ notification_id: normalizedNotificationId }),
      method: 'POST',
      token,
    }
  ).then((payload) => ({
    notificationId: payload.notification_id ?? payload.notificationId ?? normalizedNotificationId,
    ok: payload.ok ?? true,
  }));
}
