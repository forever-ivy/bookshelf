import { http } from '@/lib/http'
import type {
  OrderBundle,
  ReaderConversation,
  ReaderListItem,
  ReaderOverview,
  ReaderProfile,
  ReaderRecommendation,
} from '@/types/domain'

export async function getReaders(query?: string) {
  const response = await http.get<{ items: ReaderListItem[] }>('/api/v1/readers', query ? { q: query } : undefined)
  return response.data.items
}

export async function getReaderDetail(readerId: number) {
  const response = await http.get<{ reader: ReaderListItem }>(`/api/v1/readers/${readerId}`)
  return response.data.reader
}

export async function getReaderOverview(readerId: number) {
  const response = await http.get<{ overview: ReaderOverview }>(`/api/v1/readers/${readerId}/overview`)
  return response.data.overview
}

export async function getReaderOrders(readerId: number) {
  const response = await http.get<{ items: OrderBundle[] }>(`/api/v1/readers/${readerId}/orders`)
  return response.data.items
}

export async function getReaderConversations(readerId: number) {
  const response = await http.get<{ items: ReaderConversation[] }>(`/api/v1/readers/${readerId}/conversations`)
  return response.data.items
}

export async function getReaderRecommendations(readerId: number) {
  const response = await http.get<{ items: ReaderRecommendation[] }>(`/api/v1/readers/${readerId}/recommendations`)
  return response.data.items
}

export async function getMyProfile() {
  const response = await http.get<{ profile: ReaderProfile }>('/api/v1/readers/me/profile')
  return response.data.profile
}
