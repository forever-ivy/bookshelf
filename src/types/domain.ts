export type AuthAccount = {
  id: number
  username: string
  role: 'admin' | 'reader' | string
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
  created_at?: string | null
  updated_at?: string | null
  completed_at?: string | null
  robot?: RobotUnit | null
}

export type RobotUnit = {
  id: number
  code: string
  status: string
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
