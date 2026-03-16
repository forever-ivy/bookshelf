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
