export type MemberSummary = {
  age?: number | null;
  id: number;
  name: string;
  avatar?: string | null;
  birth_date?: string | null;
  color?: string | null;
  created_at?: string | null;
  family_id?: number | null;
  family_name?: string | null;
  gender?: string | null;
  grade_level?: string | null;
  interests?: string | null;
  pin?: string | null;
  reading_level?: string | null;
  role?: 'parent' | 'child' | 'reader' | string;
  current_goal_minutes?: number | null;
  current_streak_days?: number | null;
  updated_at?: string | null;
};

export type MemberDraft = {
  age?: number | null;
  avatar?: string | null;
  birth_date?: string | null;
  color?: string | null;
  family_id?: number | null;
  gender?: string | null;
  grade_level?: string | null;
  interests?: string | null;
  name?: string;
  pin?: string | null;
  reading_level?: string | null;
  role?: string;
};

export type AuthAccountSummary = {
  created_at?: string | null;
  id: number;
  last_login_at?: string | null;
  phone?: string | null;
  status?: string | null;
  system_role?: 'admin' | 'user' | string;
  updated_at?: string | null;
  username?: string | null;
};

export type CabinetBindingSummary = {
  cabinet_name?: string | null;
  created_at?: string | null;
  family_id?: number | null;
  family_name?: string | null;
  id?: number;
  initialized: boolean;
  updated_at?: string | null;
};

export type AuthSession = {
  account: AuthAccountSummary;
  cabinet: CabinetBindingSummary;
  token: string;
  user: MemberSummary;
};

export type AuthIdentity = Omit<AuthSession, 'token'>;

export type PairExchangeResult = {
  cabinet: CabinetBindingSummary;
  pair_code: string;
  pair_token: string;
  requires_setup: boolean;
};

export type PairIssueResult = {
  bind_url: string;
  cabinet: CabinetBindingSummary;
  expires_at: string;
  pair_code: string;
};

export type CabinetCompartment = {
  cid: number;
  status: 'free' | 'occupied' | string;
  x: number;
  y: number;
  book: string | null;
};

export type BorrowLog = {
  id?: number;
  action: string;
  action_time?: string;
  time?: string;
  title?: string;
};

export type MemberStats = {
  avatar?: string | null;
  color?: string | null;
  goal_reached: boolean;
  id?: number;
  name?: string;
  recent: BorrowLog[];
  role?: 'parent' | 'child' | 'reader' | string;
  today_ops: number;
  total_store: number;
  total_take: number;
  weekly_goal: number;
  weekly_takes: number;
};

export type WeeklyReport = {
  books: string[];
  summary: string;
};

export type MonthlyReport = {
  most_active?: string;
  summary?: string;
  top_category?: string;
  total_books?: number;
};

export type FamilyMember = {
  avatar?: string | null;
  color?: string | null;
  id: number;
  name: string;
  role?: 'parent' | 'child' | 'reader' | string;
};

export type FamilySummary = {
  created_at?: string;
  family_name: string;
  id: number;
  member_count?: number;
  owner_account_id?: number | null;
  owner_username?: string | null;
};

export type FamilyDetail = FamilySummary & {
  members: FamilyMember[];
};

export type FamilyDraft = {
  family_name?: string;
  owner_account_id?: number | null;
};

export type AccountSummary = {
  created_at?: string;
  id: number;
  last_login_at?: string | null;
  linked_user_count?: number;
  owned_family_count?: number;
  phone?: string | null;
  status?: string;
  system_role?: 'admin' | 'user' | string;
  updated_at?: string;
  username?: string | null;
};

export type AccountUserRelation = {
  account_id: number;
  avatar?: string | null;
  color?: string | null;
  created_at?: string;
  name?: string;
  relation_type: string;
  role?: 'parent' | 'child' | 'reader' | string;
  user_id: number;
};

export type UserAccountRelation = {
  account_id: number;
  created_at?: string;
  phone?: string | null;
  relation_type: string;
  status?: string;
  user_id: number;
  username?: string | null;
};

export type BookSummary = {
  age_max?: number | null;
  age_min?: number | null;
  author?: string | null;
  category?: string | null;
  compartment_ids?: string | null;
  cover_url?: string | null;
  description?: string | null;
  difficulty_level?: string | null;
  id: number;
  isbn?: string | null;
  is_on_shelf?: boolean;
  keywords?: string | null;
  on_shelf_count?: number;
  publish_year?: number | null;
  publisher?: string | null;
  tags?: string | null;
  title: string;
  updated_at?: string | null;
};

export type BookDraft = {
  age_max?: number | null;
  age_min?: number | null;
  author?: string | null;
  category?: string | null;
  cover_url?: string | null;
  description?: string | null;
  difficulty_level?: string | null;
  isbn?: string | null;
  keywords?: string | null;
  publish_year?: number | null;
  publisher?: string | null;
  tags?: string | null;
  title?: string;
};

export type BooklistItem = {
  assigned_by_user_id?: number | null;
  author?: string | null;
  book_id?: number | null;
  category?: string | null;
  cover_url?: string | null;
  created_at?: string;
  description?: string | null;
  done: boolean;
  done_at?: string | null;
  id: number;
  note?: string | null;
  title: string;
};

export type ReadingEvent = {
  book_id?: number | null;
  book_title?: string | null;
  event_time: string;
  event_type: string;
  id: number;
  metadata_json?: string | null;
  source?: string | null;
  user_id?: number | null;
  user_name?: string | null;
};

export type ReadingEventDraft = {
  book_id?: number | null;
  event_time?: string | null;
  event_type: string;
  metadata_json?: string | null;
  source?: string | null;
  user_id?: number | null;
};

export type BadgeSummary = {
  badge_key: string;
  unlocked_at: string;
};

export type MemberGoal = {
  user_id: number;
  weekly_target: number;
};

export type ShelfActionResult = {
  ai_reply?: string | null;
  reply?: string | null;
};

export type OcrIngestResult = ShelfActionResult & {
  audio_b64?: string | null;
  audio_format?: string | null;
};

export type CabinetStatusSummary = {
  connectedLabel: string;
  locationLabel: string;
  totalCompartments: number;
  usedCompartments: number;
  availableCompartments: number;
  totalBooks: number;
};
