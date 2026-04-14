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
  fulfillmentPhase?: 'dispatch_started' | 'in_transit' | 'pickup_pending' | 'delivered' | 'completed' | null;
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

export type TutorSourceType = 'book' | 'upload';

export type TutorProfileStatus = 'failed' | 'processing' | 'queued' | 'ready';

export type TutorSessionStatus = 'active' | 'archived' | 'completed';

export type TutorPersona = {
  coachingFocus?: string | null;
  greeting: string;
  name: string;
  style?: string | null;
};

export type TutorCurriculumStep = {
  goal?: string | null;
  guidingQuestion?: string | null;
  id: string;
  index?: number;
  keywords?: string[];
  learningObjective?: string | null;
  successCriteria?: string | null;
  title: string;
};

export type TutorCitation = {
  chunkId?: number | null;
  excerpt?: string | null;
  sourceTitle?: string | null;
} & Record<string, unknown>;

export type TutorSourceDocument = {
  contentHash?: string | null;
  fileName: string;
  id: number;
  kind: 'book_synthetic' | 'upload_file' | string;
  metadata?: Record<string, unknown>;
  mimeType?: string | null;
  parseStatus?: string | null;
  profileId: number;
};

export type TutorGenerationJob = {
  attemptCount?: number;
  createdAt?: string | null;
  errorMessage?: string | null;
  id: number;
  jobType?: string | null;
  profileId?: number;
  status: string;
  updatedAt?: string | null;
};

export type TutorProfile = {
  bookId: number | null;
  createdAt: string;
  curriculum: TutorCurriculumStep[];
  failureCode?: string | null;
  failureMessage?: string | null;
  id: number;
  latestJob?: TutorGenerationJob | null;
  persona: TutorPersona;
  sourceSummary?: string | null;
  sourceType: TutorSourceType;
  sources: TutorSourceDocument[];
  status: TutorProfileStatus;
  teachingGoal?: string | null;
  title: string;
  updatedAt: string;
};

export type TutorCompletedStep = {
  completedAt: string;
  confidence: number;
  stepIndex: number;
};

export type TutorSession = {
  completedSteps: TutorCompletedStep[];
  completedStepsCount: number;
  conversationSessionId: number;
  createdAt: string;
  currentStepIndex: number;
  currentStepTitle: string | null;
  id: number;
  lastMessagePreview?: string | null;
  progressLabel: string;
  status: TutorSessionStatus;
  tutorProfileId: number;
  updatedAt: string;
};

export type TutorSessionMessage = {
  citations?: TutorCitation[];
  content: string;
  createdAt: string;
  id: number;
  role: 'assistant' | 'user';
  tutorSessionId: number;
};

export type TutorSuggestion = {
  bookId?: number | null;
  description: string;
  id: string;
  kind:
    | 'continue_session'
    | 'create_from_book'
    | 'next_step'
    | 'review'
    | 'retry_generation'
    | 'start_session';
  profileId?: number | null;
  title: string;
};

export type TutorDashboardContinueSession = TutorSession & {
  personaName?: string | null;
  profileId: number;
  title: string;
};

export type TutorDashboard = {
  continueSession: TutorDashboardContinueSession | null;
  recentProfiles: TutorProfile[];
  suggestions: TutorSuggestion[];
};

export type CreateTutorProfileInput = {
  bookId: number;
  sourceType: 'book';
  teachingGoal?: string;
  title?: string;
};

export type StartTutorSessionResult = {
  firstStep: TutorCurriculumStep | null;
  session: TutorSession;
  welcomeMessage: TutorSessionMessage;
};

export type TutorStepEvaluation = {
  confidence: number;
  meetsCriteria: boolean;
  reasoning?: string | null;
  stepIndex: number;
};

export type TutorStreamEvent =
  | {
      delta: string;
      type: 'assistant.delta';
    }
  | {
      message: TutorSessionMessage;
      type: 'assistant.done';
    }
  | {
      evaluation: TutorStepEvaluation;
      type: 'evaluation';
    }
  | {
      phase?: string | null;
      type: 'status';
    }
  | {
      session: TutorSession;
      type: 'session.updated';
    }
  | {
      message: string;
      type: 'error';
    };
