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

export type LearningSourceType = 'book' | 'upload';

export type LearningProfileStatus = 'failed' | 'processing' | 'queued' | 'ready';

export type LearningSessionStatus = 'active' | 'archived' | 'completed';

export type LearningPersona = {
  coachingFocus?: string | null;
  greeting: string;
  name: string;
  style?: string | null;
};

export type LearningCurriculumStep = {
  goal?: string | null;
  guidingQuestion?: string | null;
  id: string;
  index?: number;
  keywords?: string[];
  learningObjective?: string | null;
  successCriteria?: string | null;
  title: string;
};

export type LearningCitation = {
  chunkId?: number | null;
  excerpt?: string | null;
  sourceTitle?: string | null;
} & Record<string, unknown>;

export type LearningSourceDocument = {
  contentHash?: string | null;
  fileName: string;
  id: number;
  kind: 'book_asset' | 'book_synthetic' | 'upload_file' | string;
  metadata?: Record<string, unknown>;
  mimeType?: string | null;
  originBookSourceDocumentId?: number | null;
  parseStatus?: string | null;
  profileId: number;
  storagePath?: string | null;
};

export type LearningGenerationJob = {
  attemptCount?: number;
  createdAt?: string | null;
  errorMessage?: string | null;
  id: number;
  jobType?: string | null;
  profileId?: number;
  status: string;
  updatedAt?: string | null;
};

export type LearningProfile = {
  bookId: number | null;
  bookSourceDocumentId?: number | null;
  createdAt: string;
  curriculum: LearningCurriculumStep[];
  failureCode?: string | null;
  failureMessage?: string | null;
  id: number;
  latestJob?: LearningGenerationJob | null;
  persona: LearningPersona;
  sourceSummary?: string | null;
  sourceType: LearningSourceType;
  sources: LearningSourceDocument[];
  status: LearningProfileStatus;
  teachingGoal?: string | null;
  title: string;
  updatedAt: string;
};

export type LearningCompletedStep = {
  completedAt: string;
  confidence: number;
  stepIndex: number;
};

export type LearningSession = {
  completedSteps: LearningCompletedStep[];
  completedStepsCount: number;
  conversationSessionId: number;
  createdAt: string;
  currentStepIndex: number;
  currentStepTitle: string | null;
  focusContext?: Record<string, unknown> | null;
  focusStepIndex?: number | null;
  id: number;
  lastMessagePreview?: string | null;
  learningMode?: string | null;
  progressLabel: string;
  sessionKind?: 'explore' | 'guide';
  status: LearningSessionStatus;
  learningProfileId: number;
  sourceSessionId?: number | null;
  sourceTurnId?: number | null;
  updatedAt: string;
};

export type LearningBridgeAction = {
  actionType: 'attach_explore_turn_to_guide_step' | 'expand_step_to_explore' | string;
  description?: string | null;
  label?: string | null;
  targetGuideSessionId?: number | null;
  targetStepIndex?: number | null;
  turnId?: number | null;
};

export type LearningGuidePresentation = {
  bridgeActions: LearningBridgeAction[];
  evidence: LearningCitation[];
  examiner: LearningStepEvaluation & {
    label?: string | null;
  };
  followups: string[];
  kind: 'guide';
  peer?: {
    content: string;
  } | null;
  relatedConcepts?: string[];
  step?: {
    guidingQuestion?: string | null;
    index?: number | null;
    objective?: string | null;
    successCriteria?: string | null;
    title?: string | null;
  } | null;
  teacher: {
    content: string;
  };
};

export type LearningExplorePresentation = {
  answer: {
    content: string;
  };
  bridgeActions: LearningBridgeAction[];
  evidence: LearningCitation[];
  focus?: {
    guidingQuestion?: string | null;
    objective?: string | null;
    stepIndex?: number | null;
    stepTitle?: string | null;
  } | null;
  followups: string[];
  kind: 'explore';
  reasoningContent?: string | null;
  relatedConcepts: string[];
};

export type LearningConversationPresentation =
  | LearningExplorePresentation
  | LearningGuidePresentation;

export type LearningSessionMessage = {
  citations?: LearningCitation[];
  content: string;
  createdAt: string;
  id: number;
  intentKind?: string | null;
  role: 'assistant' | 'user';
  learningSessionId: number;
  presentation?: LearningConversationPresentation | null;
  redirectedSessionId?: number | null;
  responseMode?: string | null;
};

export type LearningGraphNodeType =
  | 'Book'
  | 'Claim'
  | 'Concept'
  | 'Definition'
  | 'Formula'
  | 'Fragment'
  | 'LessonStep'
  | 'Method'
  | 'Section'
  | 'SourceAsset'
  | 'Theorem'
  | string;

export type LearningGraphNode = {
  id: string;
  label: string;
  profileId?: number | null;
  type: LearningGraphNodeType;
} & Record<string, unknown>;

export type LearningGraphEdge = {
  source: string;
  target: string;
  type: string;
} & Record<string, unknown>;

export type LearningGraph = {
  edges: LearningGraphEdge[];
  nodes: LearningGraphNode[];
  provider: string;
};

export type LearningPdfAnchorRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type LearningPdfAnchor = {
  pageNumber: number;
  rects: LearningPdfAnchorRect[];
  textAfter?: string | null;
  textBefore?: string | null;
  textQuote?: string | null;
};

export type LearningReaderLayoutMode = 'horizontal' | 'vertical' | string;

export type LearningReaderProgress = {
  layoutMode: LearningReaderLayoutMode;
  metadata: Record<string, unknown>;
  pageNumber: number;
  profileId?: number | null;
  readerId: string;
  scale: number;
  updatedAt?: string | null;
};

export type LearningPdfAnnotationType = 'highlight' | 'note' | string;

export type LearningPdfAnnotation = {
  anchor: LearningPdfAnchor;
  annotationType: LearningPdfAnnotationType;
  color: string | null;
  createdAt?: string | null;
  id: number;
  metadata: Record<string, unknown>;
  noteText: string | null;
  pageNumber: number;
  profileId?: number | null;
  readerId: string;
  selectedText: string;
  updatedAt?: string | null;
};

export type LearningReaderState = {
  annotations: LearningPdfAnnotation[];
  progress: LearningReaderProgress;
  readerId: string;
};

export type LearningReaderProgressInput = {
  layoutMode?: LearningReaderLayoutMode;
  metadata?: Record<string, unknown>;
  pageNumber: number;
  scale?: number;
};

export type LearningPdfAnnotationInput = {
  anchor: LearningPdfAnchor;
  annotationType: LearningPdfAnnotationType;
  color?: string | null;
  metadata?: Record<string, unknown>;
  noteText?: string | null;
  pageNumber: number;
  selectedText: string;
};

export type LearningPdfAnnotationUpdateInput = Partial<LearningPdfAnnotationInput>;

export type LearningQuickExplainInput = {
  anchor?: LearningPdfAnchor | null;
  nearbyText?: string | null;
  pageNumber: number;
  selectedText?: string | null;
  surroundingText?: string | null;
};

export type LearningQuickExplainResult = {
  answer: string;
  modelName: string | null;
};

export type LearningSuggestion = {
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

export type LearningDashboardContinueSession = LearningSession & {
  personaName?: string | null;
  profileId: number;
  title: string;
};

export type LearningDashboard = {
  continueSession: LearningDashboardContinueSession | null;
  recentProfiles: LearningProfile[];
  suggestions: LearningSuggestion[];
};

export type CreateLearningProfileInput = {
  bookId: number;
  bookSourceDocumentId?: number;
  sourceType: 'book';
  teachingGoal?: string;
  title?: string;
};

export type StartLearningSessionResult = {
  firstStep: LearningCurriculumStep | null;
  session: LearningSession;
  welcomeMessage: LearningSessionMessage;
};

export type LearningStepEvaluation = {
  confidence?: number;
  meetsCriteria?: boolean;
  passed: boolean;
  masteryScore: number;
  missingConcepts: string[];
  reasoning?: string | null;
  feedback?: string | null;
  stepIndex: number;
};

export type LearningStreamEvent =
  | {
      actions: LearningBridgeAction[];
      type: 'bridge.actions';
    }
  | {
      items: LearningCitation[];
      type: 'evidence.items';
    }
  | {
      delta: string;
      type: 'assistant.delta';
    }
  | {
      kind: string;
      source?: string | null;
      stepIndex?: number | null;
      type: 'guide.intent';
    }
  | {
      message: LearningSessionMessage;
      type: 'assistant.final';
    }
  | {
      evaluation: LearningStepEvaluation;
      type: 'evaluation';
    }
  | {
      items: string[];
      type: 'explore.related_concepts';
    }
  | {
      items: string[];
      type: 'followups.items';
    }
  | {
      messageId?: string | null;
      text: string;
      type: 'resume.user_message';
    }
  | {
      delta: string;
      type: 'explore.answer.delta';
    }
  | {
      delta: string;
      type: 'explore.reasoning.delta';
    }
  | {
      delta: string;
      type: 'peer.delta';
    }
  | {
      phase?: string | null;
      type: 'status';
    }
  | {
      session: LearningSession;
      bridgeAction?: Record<string, unknown> | null;
      recommendedPrompts?: string[];
      targetMode: 'explore';
      type: 'session.redirect';
    }
  | {
      session: LearningSession;
      type: 'session.updated';
    }
  | {
      delta: string;
      type: 'teacher.delta';
    }
  | {
      code?: string;
      message: string;
      type: 'error';
    };
