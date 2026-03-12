export type MemberSummary = {
  id: number;
  name: string;
  avatar?: string | null;
  color?: string | null;
  role?: 'parent' | 'child' | 'reader' | string;
  current_goal_minutes?: number | null;
  current_streak_days?: number | null;
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
  created_at?: string;
  done: boolean;
  id: number;
  note?: string | null;
  title: string;
};

export type BadgeSummary = {
  badge_key: string;
  unlocked_at: string;
};

export type CabinetStatusSummary = {
  connectedLabel: string;
  locationLabel: string;
  totalCompartments: number;
  usedCompartments: number;
  availableCompartments: number;
  totalBooks: number;
};
