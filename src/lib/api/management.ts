import { http } from '@/lib/http'
import type {
  AdminAlert,
  AdminAuditLog,
  AdminBook,
  AdminBookCategory,
  AdminBookTag,
  AdminCabinet,
  AdminCabinetSlot,
  AdminDashboardOverview,
  AdminHeatmapItem,
  AdminInventoryCorrection,
  AdminInventoryRecord,
  AdminPermission,
  AdminReader,
  AdminRecommendationInsights,
  AdminRecommendationPlacement,
  AdminRole,
  AdminSystemAdmin,
  AdminSystemSetting,
  AdminTopicBooklist,
  PaginatedResponse,
} from '@/types/domain'

export async function getAdminDashboardOverview() {
  const response = await http.get<AdminDashboardOverview>('/api/v1/admin/dashboard/overview')
  return response.data
}

export async function getAdminDashboardHeatmap() {
  const response = await http.get<{ items: AdminHeatmapItem[] }>('/api/v1/admin/dashboard/heatmap')
  return response.data
}

export async function getAdminBooks(query?: string) {
  const response = await http.get<PaginatedResponse<AdminBook>>('/api/v1/admin/books', query ? { query } : undefined)
  return response.data
}

export async function createAdminBook(payload: {
  title: string
  author?: string
  category_id?: number
  tag_ids?: number[]
  isbn?: string
  barcode?: string
  summary?: string
  shelf_status?: string
}) {
  const response = await http.post<{ book: AdminBook }>('/api/v1/admin/books', payload)
  return response.data.book
}

export async function updateAdminBook(
  bookId: number,
  payload: {
    title?: string
    author?: string
    category_id?: number
    tag_ids?: number[]
    isbn?: string
    barcode?: string
    summary?: string
    shelf_status?: string
  },
) {
  const response = await http.patch<{ book: AdminBook }>(`/api/v1/admin/books/${bookId}`, payload)
  return response.data.book
}

export async function setAdminBookStatus(bookId: number, shelfStatus: string) {
  const response = await http.post<{ book: AdminBook }>(`/api/v1/admin/books/${bookId}/status`, {
    shelf_status: shelfStatus,
  })
  return response.data.book
}

export async function getAdminCategories() {
  const response = await http.get<PaginatedResponse<AdminBookCategory>>('/api/v1/admin/categories')
  return response.data
}

export async function createAdminCategory(payload: {
  code: string
  name: string
  description?: string
  status?: string
}) {
  const response = await http.post<{ category: AdminBookCategory }>('/api/v1/admin/categories', payload)
  return response.data.category
}

export async function getAdminTags() {
  const response = await http.get<PaginatedResponse<AdminBookTag>>('/api/v1/admin/tags')
  return response.data
}

export async function createAdminTag(payload: {
  code: string
  name: string
  description?: string
}) {
  const response = await http.post<{ tag: AdminBookTag }>('/api/v1/admin/tags', payload)
  return response.data.tag
}

export async function getAdminAlerts(status?: string) {
  const response = await http.get<PaginatedResponse<AdminAlert>>('/api/v1/admin/alerts', status ? { status } : undefined)
  return response.data
}

export async function getAdminAuditLogs(params?: {
  admin_id?: number
  target_type?: string
  action?: string
}) {
  const response = await http.get<PaginatedResponse<AdminAuditLog>>('/api/v1/admin/audit-logs', params)
  return response.data
}

export async function ackAdminAlert(alertId: number, note?: string) {
  const response = await http.post<{ alert: AdminAlert }>(`/api/v1/admin/alerts/${alertId}/ack`, note ? { note } : {})
  return response.data.alert
}

export async function resolveAdminAlert(alertId: number, note?: string) {
  const response = await http.post<{ alert: AdminAlert }>(`/api/v1/admin/alerts/${alertId}/resolve`, note ? { note } : {})
  return response.data.alert
}

export async function getAdminSystemSettings() {
  const response = await http.get<PaginatedResponse<AdminSystemSetting>>('/api/v1/admin/system/settings')
  return response.data
}

export async function upsertAdminSystemSetting(
  settingKey: string,
  payload: {
    value_type: string
    value_json: Record<string, unknown>
    description?: string
  },
) {
  const response = await http.put<{ setting: AdminSystemSetting }>(`/api/v1/admin/system/settings/${settingKey}`, payload)
  return response.data.setting
}

export async function getAdminSystemPermissions() {
  const response = await http.get<PaginatedResponse<AdminPermission>>('/api/v1/admin/system/permissions')
  return response.data
}

export async function getAdminSystemRoles() {
  const response = await http.get<PaginatedResponse<AdminRole>>('/api/v1/admin/system/roles')
  return response.data
}

export async function upsertAdminSystemRole(
  roleCode: string,
  payload: {
    name: string
    description?: string
    permission_codes: string[]
    admin_ids: number[]
  },
) {
  const response = await http.put<{ role: AdminRole }>(`/api/v1/admin/system/roles/${roleCode}`, payload)
  return response.data.role
}

export async function getAdminSystemAdmins() {
  const response = await http.get<PaginatedResponse<AdminSystemAdmin>>('/api/v1/admin/system/admins')
  return response.data
}

export async function getAdminCabinets(status?: string) {
  const response = await http.get<PaginatedResponse<AdminCabinet>>('/api/v1/admin/cabinets', status ? { status } : undefined)
  return response.data
}

export async function getAdminCabinetSlots(cabinetId: string, status?: string) {
  const response = await http.get<PaginatedResponse<AdminCabinetSlot>>(
    `/api/v1/admin/cabinets/${cabinetId}/slots`,
    status ? { status } : undefined,
  )
  return response.data
}

export async function getAdminInventoryRecords(cabinetId?: string) {
  const response = await http.get<PaginatedResponse<AdminInventoryRecord>>(
    '/api/v1/admin/inventory/records',
    cabinetId ? { cabinet_id: cabinetId } : undefined,
  )
  return response.data
}

export async function getAdminInventoryAlerts(status?: string) {
  const response = await http.get<PaginatedResponse<AdminAlert>>(
    '/api/v1/admin/inventory/alerts',
    status ? { status } : undefined,
  )
  return response.data
}

export async function applyAdminInventoryCorrection(payload: {
  cabinet_id: string
  book_id: number
  total_delta?: number
  available_delta?: number
  reserved_delta?: number
  slot_code?: string
  reason?: string
}) {
  const response = await http.post<{ correction: AdminInventoryCorrection }>('/api/v1/admin/inventory/corrections', payload)
  return response.data.correction
}

export async function getAdminReaders(query?: string) {
  const response = await http.get<PaginatedResponse<AdminReader>>('/api/v1/admin/readers', query ? { query } : undefined)
  return response.data
}

export async function getAdminReader(readerId: number) {
  const response = await http.get<{ reader: AdminReader }>(`/api/v1/admin/readers/${readerId}`)
  return response.data.reader
}

export async function updateAdminReader(readerId: number, payload: Partial<AdminReader>) {
  const response = await http.patch<{ reader: AdminReader }>(`/api/v1/admin/readers/${readerId}`, payload)
  return response.data.reader
}

export async function getAdminRecommendationPlacements() {
  const response = await http.get<PaginatedResponse<AdminRecommendationPlacement>>('/api/v1/admin/recommendation/placements')
  return response.data
}

export async function createAdminRecommendationPlacement(payload: {
  code: string
  name: string
  status?: string
  placement_type?: string
  config_json?: Record<string, unknown>
}) {
  const response = await http.post<{ placement: AdminRecommendationPlacement }>('/api/v1/admin/recommendation/placements', payload)
  return response.data.placement
}

export async function getAdminTopicBooklists() {
  const response = await http.get<PaginatedResponse<AdminTopicBooklist>>('/api/v1/admin/recommendation/topic-booklists')
  return response.data
}

export async function createAdminTopicBooklist(payload: {
  slug: string
  title: string
  description?: string
  status?: string
  audience_segment?: string
  book_ids?: number[]
}) {
  const response = await http.post<{ topic_booklist: AdminTopicBooklist }>('/api/v1/admin/recommendation/topic-booklists', payload)
  return response.data.topic_booklist
}

export async function getAdminRecommendationInsights() {
  const response = await http.get<AdminRecommendationInsights>('/api/v1/admin/recommendation/insights')
  return response.data
}
