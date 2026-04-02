import * as SecureStore from 'expo-secure-store';

const DISMISSED_NOTIFICATIONS_STORAGE_KEY = 'library.reader.dismissed-notifications';

export function getDismissedNotificationsStorageKey(accountId?: number | null) {
  if (!accountId) {
    return DISMISSED_NOTIFICATIONS_STORAGE_KEY;
  }

  return `${DISMISSED_NOTIFICATIONS_STORAGE_KEY}.${accountId}`;
}

export async function readDismissedNotificationIds(storageKey: string) {
  const payload = await SecureStore.getItemAsync(storageKey);
  if (!payload) {
    return [];
  }

  try {
    const parsed = JSON.parse(payload);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  } catch {
    return [];
  }
}

export async function writeDismissedNotificationIds(storageKey: string, ids: Iterable<string>) {
  const normalizedIds = [...new Set(Array.from(ids).filter((item) => item.trim().length > 0))];

  if (normalizedIds.length === 0) {
    await SecureStore.deleteItemAsync(storageKey);
    return;
  }

  await SecureStore.setItemAsync(storageKey, JSON.stringify(normalizedIds));
}
