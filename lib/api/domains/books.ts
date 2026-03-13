import { createHttpClient } from '@/lib/api/core/http';

type BookMutation = Record<string, unknown>;
type BooksQuery = {
  category?: string;
  limit?: number;
  q?: string;
  stored_only?: boolean;
};

export function createBooksApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    createBook(payload: BookMutation) {
      return http.post('/api/books', {
        data: payload,
      });
    },
    getBook(bookId: number) {
      return http.get(`/api/books/${bookId}`);
    },
    listBooks(query: BooksQuery = {}) {
      return http.get('/api/books', { params: query });
    },
    updateBook(bookId: number, payload: BookMutation) {
      return http.put(`/api/books/${bookId}`, {
        data: payload,
      });
    },
  };
}
