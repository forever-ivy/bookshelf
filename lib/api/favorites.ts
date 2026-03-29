import type { FavoriteBook } from '@/lib/api/types';
import { listMockFavorites, toggleMockFavorite } from '@/lib/api/mock';
import { libraryFetchJson, libraryRequest } from '@/lib/api/client';
import { normalizeBookCard } from '@/lib/api/catalog';

export async function listFavorites(token?: string | null): Promise<FavoriteBook[]> {
  return libraryRequest('/api/v1/favorites/books', {
    fallback: listMockFavorites,
    method: 'GET',
    token,
  }).then(async (payload: any) => {
    if (Array.isArray(payload?.items)) {
      return payload.items.map((item: any) => ({
        createdAt: item.created_at ?? item.createdAt ?? null,
        id: String(item.id ?? item.book_id ?? item.bookId ?? item.book?.id),
        book: normalizeBookCard(item.book ?? item),
      }));
    }

    return listMockFavorites();
  });
}

export async function toggleFavorite(bookId: number, token?: string | null): Promise<FavoriteBook[]> {
  if (token) {
    try {
      const current = await listFavorites(token);
      const exists = current.some((item) => item.book.id === bookId);
      if (exists) {
        await libraryFetchJson(`/api/v1/favorites/books`, {
          body: JSON.stringify({ book_id: bookId }),
          method: 'DELETE',
          token,
        });
      } else {
        await libraryFetchJson(`/api/v1/favorites/books`, {
          body: JSON.stringify({ book_id: bookId }),
          method: 'POST',
          token,
        });
      }
      return listFavorites(token);
    } catch {
      return toggleMockFavorite(bookId);
    }
  }

  return libraryRequest('/api/v1/favorites/books', {
    body: JSON.stringify({ book_id: bookId }),
    fallback: async () => toggleMockFavorite(bookId),
    method: 'POST',
    token,
  }).then(() => listFavorites(token));
}
