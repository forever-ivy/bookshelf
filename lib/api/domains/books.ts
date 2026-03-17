import { bookSummarySchema, bookWriteResultSchema } from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type { BookDraft, BookSummary } from '@/lib/api/contracts/types';
import { z } from 'zod';

type BooksQuery = {
  category?: string;
  limit?: number;
  q?: string;
  stored_only?: boolean;
};

const booksSchema = z.array(bookSummarySchema);

export function createBooksApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    createBook(payload: BookDraft) {
      return http.post<{ book: BookSummary; id?: number }>('/api/books', {
        data: payload,
        schema: bookWriteResultSchema,
      });
    },
    getBook(bookId: number) {
      return http.get<BookSummary>(`/api/books/${bookId}`, {
        schema: bookSummarySchema,
      });
    },
    listBooks(query: BooksQuery = {}) {
      return http.get<BookSummary[]>('/api/books', {
        params: query,
        schema: booksSchema,
      });
    },
    updateBook(bookId: number, payload: BookDraft) {
      return http.put<{ book: BookSummary; id?: number }>(`/api/books/${bookId}`, {
        data: payload,
        schema: bookWriteResultSchema,
      });
    },
  };
}
