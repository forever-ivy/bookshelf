import type { FavoriteBook } from '@/lib/api/types';
import { LibraryApiError, libraryFetchJson, libraryRequest } from '@/lib/api/client';
import { normalizeBookCard } from '@/lib/api/catalog';

export async function listFavorites(
  token?: string | null,
  filters: {
    category?: string | null;
    query?: string;
  } = {}
): Promise<FavoriteBook[]> {
  return libraryRequest(buildFavoritesUrl(filters), {
    fallback: throwServiceNotConfigured,
    method: 'GET',
    token,
  }).then(async (payload: any) => resolveFavoriteItems(payload).map(normalizeFavoriteItem));
}

export async function toggleFavorite(bookId: number, token?: string | null): Promise<FavoriteBook[]> {
  const current = await listFavorites(token);
  const exists = current.some((item) => item.book.id === bookId);

  await libraryFetchJson(`/api/v1/favorites/books`, {
    body: JSON.stringify({ book_id: bookId }),
    method: exists ? 'DELETE' : 'POST',
    token,
  });

  return listFavorites(token);
}

function normalizeFavoriteItem(item: any): FavoriteBook {
  const favoriteId = item?.id ?? item?.book_id ?? item?.bookId ?? item?.book?.id;
  if (favoriteId === undefined || favoriteId === null) {
    throw invalidFavoritesPayload(item);
  }

  return {
    createdAt: item?.created_at ?? item?.createdAt ?? null,
    id: String(favoriteId),
    book: normalizeBookCard(item?.book ?? item),
  };
}

function resolveFavoriteItems(payload: any): any[] {
  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items;
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  throw invalidFavoritesPayload(payload);
}

function invalidFavoritesPayload(details: unknown) {
  return new LibraryApiError('favorites_invalid_payload', {
    code: 'favorites_invalid_payload',
    details,
    status: 500,
  });
}

function throwServiceNotConfigured(): never {
  throw new LibraryApiError('library_service_not_configured', {
    code: 'service_not_configured',
  });
}

function buildFavoritesUrl(filters: {
  category?: string | null;
  query?: string;
}) {
  const params = new URLSearchParams();
  const query = filters.query?.trim();
  const category = filters.category?.trim();

  if (query) {
    params.set('query', query);
  }

  if (category) {
    params.set('category', category);
  }

  const search = params.toString();
  return search ? `/api/v1/favorites/books?${search}` : '/api/v1/favorites/books';
}
