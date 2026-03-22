import { http } from '@/lib/http'
import type { Book } from '@/types/domain'

export async function getBooks(query?: string) {
  const endpoint = query ? '/api/v1/catalog/books/search' : '/api/v1/catalog/books'
  const response = await http.get<{ items: Book[]; total: number; query?: string }>(endpoint, query ? { query } : undefined)
  return response.data
}

export async function getBookDetail(bookId: number) {
  const response = await http.get<Book>(`/api/v1/catalog/books/${bookId}`)
  return response.data
}
