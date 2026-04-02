export type LoginIdentifierType = 'phone' | 'student_id';

export type OnboardingState = {
  completed: boolean;
  needsInterestSelection: boolean;
  needsProfileBinding: boolean;
};

export type SessionIdentity = {
  accountId: number;
  role: 'reader' | 'admin';
  profileId: number | null;
};

export type StudentProfile = {
  id: number;
  accountId: number;
  displayName: string;
  affiliationType: string | null;
  college: string | null;
  major: string | null;
  gradeYear: string | null;
  interestTags: string[];
  readingProfileSummary: string | null;
  onboarding: OnboardingState;
};

export type SessionAccount = {
  id: number;
  role: 'reader' | 'admin';
  username: string;
  identifierType?: LoginIdentifierType;
};

export type SessionPayload = {
  accessToken: string;
  refreshToken?: string | null;
  account: SessionAccount;
  identity: SessionIdentity;
  onboarding: OnboardingState;
  profile: StudentProfile | null;
};

export type BookCard = {
  id: number;
  author: string;
  availabilityLabel: string;
  cabinetLabel: string;
  category: string | null;
  coverTone: 'apricot' | 'blue' | 'coral' | 'lavender' | 'mint';
  coverUrl?: string | null;
  deliveryAvailable: boolean;
  etaLabel: string;
  etaMinutes: number | null;
  matchedFields: string[];
  recommendationReason: string | null;
  shelfLabel: string;
  stockStatus: string;
  summary: string;
  tags: string[];
  title: string;
};

export type BookDetail = {
  catalog: BookCard & {
    contents: string[];
    locationNote: string;
  };
  peopleAlsoBorrowed: BookCard[];
  recommendationReason: string | null;
  relatedBooks: BookCard[];
};

export type BookCardPage = {
  hasMore: boolean;
  items: BookCard[];
  limit: number;
  offset: number;
  query: string;
  total: number;
};

export type CatalogCategory = {
  id: number | string;
  name: string;
};

export type RecommendationFeed = {
  examZone: BookCard[];
  explanationCard: {
    body: string;
    title: string;
  };
  hotLists: Array<{
    description: string;
    id: string;
    title: string;
  }>;
  quickActions: Array<{
    code: string;
    description: string;
    meta: string;
    source: 'system_generated';
    title: string;
  }>;
  systemBooklists: Array<{
    description: string;
    id: string;
    title: string;
  }>;
  todayRecommendations: BookCard[];
};

export type RecommendationModule = {
  error: string | null;
  ok: boolean;
  results: BookCard[];
  sourceBook: {
    bookId: number | null;
    title: string | null;
  } | null;
};

export type RecommendationDashboard = {
  focusBook: {
    bookId: number | null;
    title: string | null;
  } | null;
  historyBooks: Array<{
    bookId: number | null;
    title: string | null;
  }>;
  modules: {
    collaborative: RecommendationModule;
    hybrid: RecommendationModule;
    similar: RecommendationModule;
  };
  personalized: BookCard[];
  readerId: number | null;
  suggestedQueries: string[];
};

export type DeliveryStatusTimeline = Array<{
  completed: boolean;
  label: string;
  timestamp?: string | null;
}>;

export type BorrowOrderView = {
  actionableLabel: string;
  book: BookCard;
  cancellable: boolean;
  dueDateLabel: string;
  id: number;
  mode: 'cabinet_pickup' | 'robot_delivery';
  note: string;
  renewable: boolean;
  returnable: boolean;
  status: 'active' | 'cancelled' | 'completed' | 'dueSoon' | 'overdue' | 'renewable';
  statusLabel: string;
  timeline: DeliveryStatusTimeline;
};

export type ReturnRequestSummary = {
  borrowOrderId: number;
  borrowOrderStatus: string | null;
  id: number;
  note: string | null;
  readerId: number | null;
  status: string;
};

export type ReturnRequestDetail = {
  order: BorrowOrderView;
  returnRequest: ReturnRequestSummary;
};

export type FavoriteBook = {
  createdAt?: string | null;
  id: string;
  book: BookCard;
};

export type BooklistSummary = {
  books: BookCard[];
  description: string | null;
  id: string;
  source: 'custom' | 'system';
  title: string;
};

export type NotificationItem = {
  body: string;
  id: string;
  kind: 'achievement' | 'borrowing' | 'delivery' | 'reminder';
  title: string;
};

export type AchievementSummary = {
  currentPoints: number;
  summary: {
    aiAssists: number;
    completedOrders: number;
    readingDays: number;
    totalBorrowedBooks: number;
  };
  streakLabel: string;
};

export type ReaderOverviewStats = {
  activeOrdersCount: number;
  borrowHistoryCount: number;
  searchCount: number;
  recommendationCount: number;
  conversationCount: number;
  readingEventCount: number;
  lastActiveAt: string | null;
};

export type ReaderOverview = {
  profile: StudentProfile | null;
  recentConversations: Array<Record<string, unknown>>;
  recentOrders: BorrowOrderView[];
  recentQueries: string[];
  recentReadingEvents: Array<Record<string, unknown>>;
  recentRecommendations: Array<Record<string, unknown>>;
  stats: ReaderOverviewStats;
};
