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
  AdminRecommendationDebugDashboardResult,
  AdminRecommendationDebugModuleResult,
  AdminRecommendationDebugSearchResult,
  AdminRecommendationStudio,
  AdminRecommendationStudioDraft,
  AdminRecommendationStudioDraftSaveResult,
  AdminRecommendationStudioPublicationList,
  AdminRecommendationStudioPreviewFeed,
  AdminRecommendationStudioPublishResult,
  AdminRecommendationStudioQuickAction,
  AdminRole,
  AdminSystemAdmin,
  AdminSystemSetting,
  PaginatedResponse,
} from '@/types/domain'

type RecommendationStudioQuickActionInput = Omit<AdminRecommendationStudioQuickAction, 'source'> & {
  source?: AdminRecommendationStudioQuickAction['source']
}

function normalizeRecommendationStudioQuickAction(
  item: RecommendationStudioQuickActionInput,
): AdminRecommendationStudioQuickAction {
  return {
    ...item,
    source: 'system_generated',
  }
}

function normalizeRecommendationStudioPreviewFeed(
  previewFeed: AdminRecommendationStudioPreviewFeed,
): AdminRecommendationStudioPreviewFeed {
  return {
    ...previewFeed,
    quick_actions: (previewFeed.quick_actions ?? []).map(normalizeRecommendationStudioQuickAction),
  }
}

function normalizeRecommendationStudio(studio: AdminRecommendationStudio): AdminRecommendationStudio {
  return {
    ...studio,
    preview_feed: normalizeRecommendationStudioPreviewFeed(studio.preview_feed),
  }
}

function normalizeRecommendationStudioDraftSaveResult(
  result: AdminRecommendationStudioDraftSaveResult,
): AdminRecommendationStudioDraftSaveResult {
  return {
    ...result,
    preview_feed: normalizeRecommendationStudioPreviewFeed(result.preview_feed),
  }
}

function normalizeRecommendationStudioPublishResult(
  result: AdminRecommendationStudioPublishResult,
): AdminRecommendationStudioPublishResult {
  return {
    ...result,
    preview_feed: normalizeRecommendationStudioPreviewFeed(result.preview_feed),
  }
}

export async function getAdminDashboardOverview() {
  const response = await http.get<AdminDashboardOverview>('/api/v1/admin/dashboard/overview')
  return response.data
}

export async function getAdminDashboardHeatmap() {
  const response = await http.get<{ items: AdminHeatmapItem[] }>('/api/v1/admin/dashboard/heatmap')
  return response.data
}

type AdminBooksQuery = {
  query?: string
  page?: number
  pageSize?: number
  categoryId?: number
  shelfStatus?: string
}

type AdminPaginationQuery = {
  page?: number
  pageSize?: number
}

type AdminCabinetSlotsQuery = AdminPaginationQuery & {
  status?: string
}

type AdminInventoryRecordsQuery = AdminPaginationQuery & {
  cabinetId?: string
  eventType?: string
}

type AdminInventoryAlertsQuery = AdminPaginationQuery & {
  status?: string
  sourceId?: string
}

type AdminReadersQuery = AdminPaginationQuery & {
  query?: string
  restrictionStatus?: string
  segmentCode?: string
}

export async function getAdminBooks(params: AdminBooksQuery = {}) {
  const response = await http.get<PaginatedResponse<AdminBook>>('/api/v1/admin/books', {
    query: params.query,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 50,
    shelf_status: params.shelfStatus,
    category_id: params.categoryId,
  })
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

export async function getAdminCategories(params: AdminPaginationQuery & { query?: string; status?: string } = {}) {
  const response = await http.get<PaginatedResponse<AdminBookCategory>>('/api/v1/admin/categories', {
    query: params.query,
    status: params.status,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
  })
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

export async function getAdminTags(params: AdminPaginationQuery & { query?: string } = {}) {
  const response = await http.get<PaginatedResponse<AdminBookTag>>('/api/v1/admin/tags', {
    query: params.query,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
  })
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

export async function getAdminAlerts(params?: { status?: string; severity?: string }) {
  const response = await http.get<PaginatedResponse<AdminAlert>>(
    '/api/v1/admin/alerts',
    params?.status || params?.severity ? { status: params?.status, severity: params?.severity } : undefined,
  )
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

export async function getAdminCabinetSlots(cabinetId: string, params: AdminCabinetSlotsQuery = {}) {
  const response = await http.get<PaginatedResponse<AdminCabinetSlot>>(
    `/api/v1/admin/cabinets/${cabinetId}/slots`,
    {
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
      status: params.status,
    },
  )
  return response.data
}

export async function getAdminInventoryRecords(params: AdminInventoryRecordsQuery = {}) {
  const response = await http.get<PaginatedResponse<AdminInventoryRecord>>(
    '/api/v1/admin/inventory/records',
    {
      cabinet_id: params.cabinetId,
      event_type: params.eventType,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
  )
  return response.data
}

export async function getAdminInventoryAlerts(params: AdminInventoryAlertsQuery = {}) {
  const response = await http.get<PaginatedResponse<AdminAlert>>(
    '/api/v1/admin/inventory/alerts',
    {
      status: params.status,
      source_id: params.sourceId,
      page: params.page ?? 1,
      page_size: params.pageSize ?? 20,
    },
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

export async function getAdminReaders(params: AdminReadersQuery = {}) {
  const response = await http.get<PaginatedResponse<AdminReader>>('/api/v1/admin/readers', {
    query: params.query,
    restriction_status: params.restrictionStatus,
    segment_code: params.segmentCode,
    page: params.page ?? 1,
    page_size: params.pageSize ?? 20,
  })
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

export async function getAdminRecommendationStudio() {
  const response = await http.get<AdminRecommendationStudio>('/api/v1/admin/recommendation/studio')
  return normalizeRecommendationStudio(response.data)
}

export async function saveAdminRecommendationStudioDraft(payload: AdminRecommendationStudioDraft) {
  const response = await http.put<AdminRecommendationStudioDraftSaveResult>(
    '/api/v1/admin/recommendation/studio/draft',
    payload,
  )
  return normalizeRecommendationStudioDraftSaveResult(response.data)
}

export async function publishAdminRecommendationStudio() {
  const response = await http.post<AdminRecommendationStudioPublishResult>('/api/v1/admin/recommendation/studio/publish')
  return normalizeRecommendationStudioPublishResult(response.data)
}

export async function getAdminRecommendationStudioPublications() {
  const response = await http.get<AdminRecommendationStudioPublicationList>(
    '/api/v1/admin/recommendation/studio/publications',
  )
  return response.data
}

export async function searchAdminRecommendationDebug(payload: {
  readerId?: number
  query: string
  limit?: number
}) {
  const response = await http.post<AdminRecommendationDebugSearchResult>(
    '/api/v1/admin/recommendation/debug/search',
    {
      reader_id: payload.readerId,
      query: payload.query,
      limit: payload.limit ?? 5,
    },
  )
  return response.data
}

export async function getAdminRecommendationDebugDashboard(
  readerId: number,
  params?: {
    limit?: number
    historyLimit?: number
  },
) {
  const response = await http.get<AdminRecommendationDebugDashboardResult>(
    `/api/v1/admin/recommendation/debug/readers/${readerId}/dashboard`,
    {
      limit: params?.limit ?? 5,
      history_limit: params?.historyLimit ?? 3,
    },
  )
  return response.data
}

export async function getAdminRecommendationDebugBookModule(
  readerId: number,
  bookId: number,
  params?: {
    mode?: 'similar' | 'collaborative' | 'hybrid'
    limit?: number
  },
) {
  const response = await http.get<AdminRecommendationDebugModuleResult>(
    `/api/v1/admin/recommendation/debug/readers/${readerId}/books/${bookId}`,
    {
      mode: params?.mode ?? 'hybrid',
      limit: params?.limit ?? 5,
    },
  )
  return response.data
}
