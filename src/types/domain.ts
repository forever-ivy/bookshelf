export type AuthAccount = {
  id: number
  username: string
  role: 'admin' | 'reader' | string
  role_codes?: string[]
  permission_codes?: string[]
}

export type AuthProfile = {
  id: number
  display_name: string
  affiliation_type?: string | null
  college?: string | null
  major?: string | null
  grade_year?: string | null
}

export type AuthPayload = {
  access_token: string
  refresh_token: string
  token_type: string
  account: AuthAccount
  profile?: AuthProfile | null
}

export type IdentityPayload = {
  account_id: number
  role: string
  profile_id?: number | null
  account: AuthAccount
  profile?: AuthProfile | null
}

export type Book = {
  id: number
  title: string
  author?: string | null
  category?: string | null
  keywords?: string | null
  summary?: string | null
  total_copies?: number
  available_copies?: number
  stock_status?: string
  delivery_available?: boolean
  storage_slots?: string[]
}

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
}

export type AdminBookCategory = {
  id: number
  code: string
  name: string
  description?: string | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AdminBookTag = {
  id: number
  code: string
  name: string
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AdminBook = Book & {
  category_id?: number | null
  isbn?: string | null
  barcode?: string | null
  cover_url?: string | null
  shelf_status?: string | null
  category_detail?: AdminBookCategory | null
  tags: AdminBookTag[]
  stock_summary?: {
    total_copies: number
    available_copies: number
    reserved_copies: number
  }
  copies?: Array<{
    id: number
    cabinet_id: string
    cabinet_name?: string | null
    cabinet_location?: string | null
    slot_code?: string | null
    inventory_status: string
    available_for_borrow: boolean
    created_at?: string | null
    updated_at?: string | null
  }>
}

export type AdminDashboardOverview = {
  today_borrow_count: number
  active_delivery_task_count: number
  robots: {
    online: number
    offline: number
    total: number
  }
  cabinets: {
    total: number
    status_breakdown: Record<string, number>
  }
  top_books: Array<{
    book_id: number
    title: string
    author?: string | null
    borrow_count: number
  }>
  alerts: {
    open: number
    total: number
  }
}

export type AdminHeatmapItem = {
  area: string
  demand_count: number
  cabinet_count: number
  locations: string[]
}

export type AdminAlert = {
  id: number
  source_type: string
  source_id?: string | null
  alert_type?: string
  severity: string
  status: string
  title: string
  message?: string | null
  metadata_json?: Record<string, unknown>
  acknowledged_by?: number | null
  acknowledged_at?: string | null
  resolved_by?: number | null
  resolved_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AdminAuditLog = {
  id: number
  admin_id: number
  target_type: string
  target_id: number
  action: string
  before_state?: Record<string, unknown>
  after_state?: Record<string, unknown>
  note?: string | null
  created_at?: string | null
}

export type AdminPermission = {
  id: number
  code: string
  name: string
  description?: string | null
  created_at?: string | null
}

export type AdminRole = {
  id: number
  code: string
  name: string
  description?: string | null
  permission_codes: string[]
  assigned_admin_ids: number[]
  created_at?: string | null
  updated_at?: string | null
}

export type AdminSystemAdmin = {
  id: number
  username: string
  role_codes: string[]
  created_at?: string | null
  updated_at?: string | null
}

export type AdminSystemSetting = {
  id: number
  setting_key: string
  value_type: string
  value_json: Record<string, unknown>
  description?: string | null
  created_by?: number | null
  updated_by?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type AdminCabinet = {
  id: string
  name: string
  location?: string | null
  status: string
  slot_total: number
  occupied_slots: number
  free_slots: number
  slot_status_breakdown: Record<string, number>
  total_copies: number
  available_copies: number
  reserved_copies: number
  open_alert_count: number
  created_at?: string | null
  updated_at?: string | null
}

export type AdminCabinetSlot = {
  id: number
  cabinet_id: string
  slot_code: string
  status: string
  current_copy_id?: number | null
  copy_inventory_status?: string | null
  book_id?: number | null
  book_title?: string | null
  book_author?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AdminInventoryRecord = {
  id: number
  cabinet_id: string
  cabinet_name?: string | null
  event_type: string
  slot_code?: string | null
  book_id?: number | null
  book_title?: string | null
  copy_id?: number | null
  payload_json?: Record<string, unknown>
  created_at?: string | null
}

export type AdminInventoryCorrection = {
  cabinet_id: string
  book_id: number
  stock: {
    total_copies: number
    available_copies: number
    reserved_copies: number
  }
  event: {
    id: number
    event_type: string
    slot_code?: string | null
    created_at?: string | null
  }
}

export type BorrowTrendsAnalytics = {
  items: Array<{ date: string; count: number }>
  summary: {
    days?: number
    total_orders: number
    peak_day?: string | null
    peak_count: number
  }
}

export type CollegePreferencesAnalytics = {
  items: Array<{
    college: string
    total_orders: number
    categories: Array<{ category: string; count: number }>
  }>
  summary: {
    total_colleges: number
  }
}

export type TimePeaksAnalytics = {
  items: Array<{ hour: number; count: number }>
  summary: {
    peak_hour?: number | null
    peak_count: number
  }
}

export type PopularBooksAnalytics = {
  items: Array<{
    book_id: number
    title: string
    author?: string | null
    borrow_count: number
    recommendation_count?: number
    prediction_score: number
  }>
  summary: {
    total_ranked_books: number
  }
}

export type CabinetTurnoverAnalytics = {
  items: Array<{
    cabinet_id: string
    cabinet_name: string
    location?: string | null
    status?: string
    copy_count?: number
    event_count?: number
    turnover_rate: number
  }>
  summary: {
    total_cabinets: number
  }
}

export type RobotEfficiencyAnalytics = {
  items: Array<{
    robot_id: number
    code: string
    status?: string
    battery_level?: number | null
    heartbeat_at?: string | null
    total_tasks: number
    completed_tasks?: number
    active_tasks: number
    completion_rate: number
  }>
  summary: {
    total_robots: number
  }
}

export type RetentionAnalytics = {
  summary: {
    total_readers: number
    active_readers_7d: number
    active_readers_30d?: number
    retained_readers_7d: number
    retention_rate_7d: number
  }
}

export type InventorySlot = {
  slot_code: string
  status: string
  book_id?: number | null
  current_copy_id?: number | null
}

export type InventoryEvent = {
  id: number
  event_type: string
  slot_code?: string | null
  book_id?: number | null
  copy_id?: number | null
  created_at?: string | null
}

export type InventoryStatus = {
  occupied_slots: number
  free_slots: number
  slots: InventorySlot[]
  events: InventoryEvent[]
}

export type BorrowOrder = {
  id: number
  reader_id: number
  book_id: number
  assigned_copy_id?: number | null
  order_mode: string
  status: string
  priority?: string | null
  due_at?: string | null
  failure_reason?: string | null
  intervention_status?: string | null
  attempt_count?: number
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
}

export type DeliveryOrder = {
  id: number
  borrow_order_id: number
  delivery_target: string
  eta_minutes: number
  status: string
  priority?: string | null
  due_at?: string | null
  failure_reason?: string | null
  intervention_status?: string | null
  attempt_count?: number
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
}

export type RobotTask = {
  id: number
  robot_id: number
  delivery_order_id: number
  status: string
  borrow_order_id?: number | null
  path_json?: Record<string, unknown> | null
  reassigned_from_task_id?: number | null
  failure_reason?: string | null
  attempt_count?: number
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
  robot?: RobotUnit | null
}

export type RobotUnit = {
  id: number
  code: string
  status: string
  battery_level?: number | null
  heartbeat_at?: string | null
  current_task?: RobotTask | null
}

export type RobotEvent = {
  id: number
  robot_id: number
  task_id?: number | null
  event_type: string
  metadata: Record<string, unknown>
  created_at?: string | null
}

export type OrderBundle = {
  borrow_order: BorrowOrder
  delivery_order?: DeliveryOrder | null
  robot_task?: RobotTask | null
  robot_unit?: RobotUnit | null
  robot?: RobotUnit | null
}

export type AdminReturnRequest = {
  id: number
  borrow_order_id: number
  reader_id?: number | null
  book_id?: number | null
  status: string
  note?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type ReaderProfile = {
  id: number
  account_id: number
  display_name: string
  affiliation_type?: string | null
  college?: string | null
  major?: string | null
  grade_year?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type ReaderListItem = {
  id: number
  account_id: number
  username: string
  display_name: string
  affiliation_type?: string | null
  college?: string | null
  major?: string | null
  grade_year?: string | null
  active_orders_count: number
  last_active_at?: string | null
}

export type AdminReader = ReaderListItem & {
  restriction_status?: string | null
  restriction_until?: string | null
  risk_flags: string[]
  preference_profile_json?: Record<string, unknown>
  segment_code?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type ReaderOverview = {
  profile: ReaderProfile
  stats: {
    active_orders_count: number
    borrow_history_count: number
    search_count: number
    recommendation_count: number
    conversation_count: number
    reading_event_count: number
    last_active_at?: string | null
  }
  recent_queries: string[]
  recent_orders: OrderBundle[]
  recent_recommendations: ReaderRecommendation[]
  recent_conversations: ReaderConversation[]
  recent_reading_events: ReaderReadingEvent[]
}

export type ReaderConversation = {
  id: number
  reader_id: number
  status: string
  message_count: number
  last_message_preview?: string | null
  created_at?: string | null
  updated_at?: string | null
  last_message_at?: string | null
}

export type ReaderRecommendation = {
  id: number
  reader_id: number
  book_id: number
  book_title: string
  query_text: string
  result_title: string
  rank_position: number
  score: number
  provider_note?: string | null
  explanation?: string | null
  evidence_json?: Record<string, unknown> | null
  created_at?: string | null
}

export type ReaderReadingEvent = {
  id: number
  event_type: string
  metadata_json?: Record<string, unknown> | null
  created_at?: string | null
}

export type LoginPayload = {
  username: string
  password: string
  role: 'admin'
}

export type OcrIngestResult = {
  ok: boolean
  source: string
  ocr_texts: string[]
  book?: Book
  slot?: {
    slot_code: string
    status: string
    current_copy_id?: number | null
  }
}

export type AdminRecommendationStudioCandidateBook = {
  book_id: number
  title: string
  author?: string | null
  category?: string | null
  available_copies: number
  deliverable: boolean
  eta_minutes?: number | null
  default_explanation: string
  signals?: {
    content: number
    behavior: number
    freshness: number
    blended: number
  }
}

export type AdminRecommendationStudioCandidateBooklist = {
  booklist_id: number
  title: string
  description?: string | null
  book_count?: number
}

export type AdminRecommendationStudioBookSlot = {
  book_id: number
  custom_explanation: string
  source: string
  rank: number
}

export type AdminRecommendationStudioHotList = {
  id: string
  title: string
  description: string
}

export type AdminRecommendationStudioBooklistSlot = {
  booklist_id: number
  rank: number
}

export type AdminRecommendationStudioExplanationCard = {
  title: string
  body: string
}

export type AdminRecommendationStudioPlacement = {
  code: 'today_recommendations' | 'exam_zone' | 'hot_lists' | 'system_booklists'
  name: string
  status: 'active' | 'paused'
  placement_type: string
  rank: number
}

export type AdminRecommendationStudioStrategyWeights = {
  content: number
  behavior: number
  freshness: number
}

export type AdminRecommendationStudioDraft = {
  today_recommendations: AdminRecommendationStudioBookSlot[]
  exam_zone: AdminRecommendationStudioBookSlot[]
  hot_lists: AdminRecommendationStudioHotList[]
  system_booklists: AdminRecommendationStudioBooklistSlot[]
  explanation_card: AdminRecommendationStudioExplanationCard
  placements: AdminRecommendationStudioPlacement[]
  strategy_weights: AdminRecommendationStudioStrategyWeights
}

export type AdminRecommendationStudioPreviewBook = {
  book_id: number
  title: string
  author?: string | null
  explanation: string
  available_copies: number
  deliverable: boolean
  eta_minutes?: string | number | null
}

export type AdminRecommendationStudioQuickAction = {
  code: string
  title: string
  description: string
  meta?: string | null
  source: 'system_generated'
}

export type AdminRecommendationStudioPreviewBooklist = {
  id: string
  title: string
  description?: string | null
}

export type AdminRecommendationStudioPreviewFeed = {
  today_recommendations: AdminRecommendationStudioPreviewBook[]
  exam_zone: AdminRecommendationStudioPreviewBook[]
  quick_actions: AdminRecommendationStudioQuickAction[]
  hot_lists: AdminRecommendationStudioHotList[]
  system_booklists: AdminRecommendationStudioPreviewBooklist[]
  explanation_card: AdminRecommendationStudioExplanationCard
}

export type AdminRecommendationStudioPublication = {
  id: number
  version: number
  status?: string
  published_by_username?: string | null
  published_at?: string | null
  updated_at?: string | null
  payload?: AdminRecommendationStudioDraft
}

export type AdminRecommendationStudio = {
  live_publication: AdminRecommendationStudioPublication | null
  draft: AdminRecommendationStudioDraft
  candidates: {
    today_recommendations: AdminRecommendationStudioCandidateBook[]
    exam_zone: AdminRecommendationStudioCandidateBook[]
    system_booklists: AdminRecommendationStudioCandidateBooklist[]
  }
  preview_feed: AdminRecommendationStudioPreviewFeed
}

export type AdminRecommendationStudioDraftSaveResult = {
  draft: AdminRecommendationStudioDraft
  preview_feed: AdminRecommendationStudioPreviewFeed
}

export type AdminRecommendationStudioPublishResult = {
  publication: AdminRecommendationStudioPublication
  preview_feed: AdminRecommendationStudioPreviewFeed
}

export type AdminRecommendationStudioPublicationList = {
  items: AdminRecommendationStudioPublication[]
}

export type AdminRecommendationRuntimeMeta = {
  llm_provider: string
  llm_model: string
  embedding_provider: string
  embedding_model: string
  recommendation_ml_enabled: boolean
  provider_note?: string | null
}

export type AdminRecommendationDebugResultItem = {
  book_id: number
  title: string
  author?: string | null
  category?: string | null
  score?: number
  explanation?: string | null
  provider_note?: string | null
  evidence?: Record<string, unknown> | null
  available_copies?: number
  deliverable?: boolean
  eta_minutes?: number | null
}

export type AdminRecommendationDebugSearchResult = {
  query: string
  context: Record<string, unknown>
  ranking: Record<string, unknown>
  results: AdminRecommendationDebugResultItem[]
  runtime: AdminRecommendationRuntimeMeta
}

export type AdminRecommendationDebugDashboardResult = {
  reader_id: number
  history_books?: Array<Record<string, unknown>>
  focus_book?: Record<string, unknown> | null
  personalized: AdminRecommendationDebugResultItem[]
  modules: Record<string, unknown>
  suggested_queries: string[]
  runtime: AdminRecommendationRuntimeMeta
}

export type AdminRecommendationDebugModuleResult = {
  source_book?: Record<string, unknown> | null
  ranking: Record<string, unknown>
  results: AdminRecommendationDebugResultItem[]
  runtime: AdminRecommendationRuntimeMeta
}
