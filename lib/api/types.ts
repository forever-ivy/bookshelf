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

export type DeliveryStatusTimeline = Array<{
  completed: boolean;
  label: string;
  timestamp?: string | null;
}>;

export type BorrowOrderView = {
  actionableLabel: string;
  book: BookCard;
  dueDateLabel: string;
  id: number;
  mode: 'cabinet_pickup' | 'robot_delivery';
  note: string;
  renewable: boolean;
  status: 'active' | 'completed' | 'dueSoon' | 'overdue' | 'renewable';
  statusLabel: string;
  timeline: DeliveryStatusTimeline;
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
