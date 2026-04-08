import type {
  AchievementSummary,
  BookCard,
  BookDetail,
  BooklistSummary,
  BorrowOrderView,
  FavoriteBook,
  NotificationItem,
  OnboardingState,
  RecommendationFeed,
  SessionPayload,
  StudentProfile,
} from '@/lib/api/types';

type MockLibraryState = {
  achievements: AchievementSummary;
  booklists: BooklistSummary[];
  favorites: FavoriteBook[];
  notifications: NotificationItem[];
  orders: BorrowOrderView[];
  profile: StudentProfile;
  sessionToken: string;
};

function createBaseBook(
  id: number,
  title: string,
  author: string,
  summary: string,
  tags: string[],
  options: Partial<BookCard> = {}
): BookCard {
  return {
    id,
    author,
    availabilityLabel: options.availabilityLabel ?? '馆藏充足 · 可立即借阅',
    cabinetLabel: options.cabinetLabel ?? '默认书柜',
    category: options.category ?? null,
    coverTone: options.coverTone ?? 'blue',
    coverUrl: options.coverUrl ?? null,
    deliveryAvailable: options.deliveryAvailable ?? true,
    etaLabel: options.etaLabel ?? '可送达',
    etaMinutes: options.etaMinutes ?? 15,
    matchedFields: options.matchedFields ?? ['title', 'keywords'],
    recommendationReason: options.recommendationReason ?? '与你的课程和阅读偏好高度相关',
    shelfLabel: options.shelfLabel ?? '主馆 2 楼',
    stockStatus: options.stockStatus ?? 'available',
    summary,
    tags,
    title,
  };
}

const bookLearning = createBaseBook(
  1,
  '机器学习从零到一',
  '周志华',
  '适合课程导读和期末复习的入门书。',
  ['人工智能', '入门', '课程配套'],
  {
    category: '人工智能',
    coverTone: 'lavender',
    etaLabel: '可送达',
    etaMinutes: 18,
    recommendationReason: '适合本周课程的起步阅读',
  }
);

const bookDeepLearning = createBaseBook(
  2,
  'Deep Learning',
  'Ian Goodfellow',
  '适合继续拓展模型与训练方法。',
  ['神经网络', '深度学习', 'AI'],
  {
    category: '人工智能',
    coverTone: 'blue',
    etaLabel: '到柜自取',
    deliveryAvailable: false,
    recommendationReason: '如果你在做深度学习专题，它会更系统',
    stockStatus: 'limited',
  }
);

const bookPsychology = createBaseBook(
  3,
  '心理学入门',
  '格致',
  '适合兴趣阅读和跨学科补充。',
  ['心理学', '通识'],
  {
    category: '哲学、宗教',
    coverTone: 'mint',
    etaLabel: '可送达',
    etaMinutes: 480,
    deliveryAvailable: true,
    recommendationReason: '偏兴趣阅读，适合碎片时间浏览',
  }
);

const bookProduct = createBaseBook(
  4,
  '产品设计手册',
  '陈知行',
  '从需求到信息架构，适合做学习路径的设计参考。',
  ['产品设计', '表达', '结构化思考'],
  {
    category: '工业技术',
    coverTone: 'coral',
    etaLabel: '可送达',
    etaMinutes: 10,
    recommendationReason: '如果你今晚想换换学习主题，这本很适合',
  }
);

const bookCatalog = [bookLearning, bookDeepLearning, bookPsychology, bookProduct];

const defaultProfile: StudentProfile = {
  accountId: 1,
  affiliationType: 'student',
  college: '信息与电气工程学院',
  gradeYear: '2023',
  id: 1,
  interestTags: ['AI', '课程配套', '考试复习'],
  major: '人工智能',
  onboarding: {
    completed: true,
    needsInterestSelection: false,
    needsProfileBinding: false,
  },
  readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
  displayName: '陈知行',
};

const defaultOrders: BorrowOrderView[] = [
  {
    actionableLabel: '去续借',
    book: bookDeepLearning,
    cancellable: false,
    dueDateLabel: '3 月 29 日',
    fulfillmentPhase: 'delivered',
    id: 101,
    mode: 'robot_delivery',
    note: '配套课程：人工智能导论 · 可先看第 1 章',
    renewable: true,
    returnable: false,
    status: 'renewable',
    statusLabel: '可续借',
    timeline: [
      { completed: true, label: '待取书', timestamp: '2026-03-20T12:00:00.000Z' },
      { completed: true, label: '机器人配送中', timestamp: '2026-03-20T12:18:00.000Z' },
      { completed: true, label: '已送达', timestamp: '2026-03-20T12:33:00.000Z' },
    ],
  },
  {
    actionableLabel: '查看借阅',
    book: bookLearning,
    cancellable: false,
    dueDateLabel: '4 月 2 日',
    fulfillmentPhase: 'pickup_pending',
    id: 102,
    mode: 'cabinet_pickup',
    note: '课程导读 · 适合先看第 3 章',
    renewable: false,
    returnable: false,
    status: 'active',
    statusLabel: '进行中',
    timeline: [
      { completed: true, label: '待取书' },
      { completed: true, label: '书柜出书中' },
      { completed: true, label: '已送达' },
    ],
  },
  {
    actionableLabel: '处理归还',
    book: bookPsychology,
    cancellable: false,
    dueDateLabel: '今天 21:00',
    fulfillmentPhase: 'completed',
    id: 103,
    mode: 'robot_delivery',
    note: '如果今晚不再使用，可直接发起归还请求',
    renewable: false,
    returnable: true,
    status: 'dueSoon',
    statusLabel: '临近到期',
    timeline: [{ completed: true, label: '已完成' }],
  },
];

const defaultFavorites: FavoriteBook[] = [
  { id: 'fav-1', book: bookLearning, createdAt: '2026-03-24T12:00:00.000Z' },
];

const defaultBooklists: BooklistSummary[] = [
  {
    books: [bookLearning, bookDeepLearning],
    description: '按从浅到深的顺序搭一条学习路径。',
    id: 'ai-intro',
    source: 'system',
    title: 'AI 入门书单',
  },
  {
    books: [bookPsychology, bookProduct],
    description: '今晚先看的两本轻量阅读。',
    id: 'tonight',
    source: 'custom',
    title: '今晚预习',
  },
];

const defaultNotifications: NotificationItem[] = [
  { body: '《Deep Learning》已送达，可在 21:00 前续借。', id: 'note-1', kind: 'delivery', title: '配送更新' },
  { body: '你的 AI 入门书单已更新 2 本新推荐。', id: 'note-2', kind: 'achievement', title: '推荐更新' },
];

const defaultAchievements: AchievementSummary = {
  currentPoints: 860,
  streakLabel: '连续学习 9 天',
  summary: {
    aiAssists: 14,
    completedOrders: 7,
    readingDays: 28,
    totalBorrowedBooks: 28,
  },
};

const defaultFeed: RecommendationFeed = {
  examZone: [bookLearning, bookDeepLearning],
  explanationCard: {
    body: '系统会结合你的课程、收藏和最近借阅，优先展示能立即拿到的书。',
    title: '为什么推荐给你',
  },
  hotLists: [
    { description: '最近 48 小时最热门的借阅', id: 'hot-week', title: '本周热门' },
    { description: '本院同学最常借的书', id: 'college-hot', title: '本学院热门' },
    { description: '考试前适合快速补强的书', id: 'exam-zone', title: '考试专区' },
  ],
  quickActions: [
    {
      code: 'borrow_now',
      description: '从可借、可送的书里直接开始',
      meta: '3 本优先推荐已就绪',
      source: 'system_generated',
      title: '一键借书',
    },
    {
      code: 'delivery_status',
      description: '查看机器人和书柜履约进度',
      meta: '1 单配送中',
      source: 'system_generated',
      title: '配送状态',
    },
    {
      code: 'recommendation_reason',
      description: '看看为什么推荐这几本',
      meta: '解释型推荐',
      source: 'system_generated',
      title: '推荐解释',
    },
  ],
  systemBooklists: [
    { description: '适合刚开始接触 AI 的同学', id: 'system-ai', title: 'AI 入门书单' },
    { description: '期末复习前的高频阅读', id: 'system-exam', title: '考研专区' },
    { description: '每周更新的新书集合', id: 'system-new', title: '新书推荐' },
  ],
  todayRecommendations: [bookLearning, bookDeepLearning, bookProduct],
};

const defaultOnboarding: OnboardingState = defaultProfile.onboarding;

let mockState: MockLibraryState = {
  achievements: defaultAchievements,
  booklists: defaultBooklists,
  favorites: defaultFavorites,
  notifications: defaultNotifications,
  orders: defaultOrders,
  profile: defaultProfile,
  sessionToken: 'mock-reader-token',
};

function clone<T>(value: T): T {
  return typeof globalThis.structuredClone === 'function'
    ? globalThis.structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

export function createMockSessionPayload(): SessionPayload {
  return {
    accessToken: mockState.sessionToken,
    account: {
      identifierType: 'student_id',
      id: mockState.profile.accountId,
      role: 'reader',
      username: 'student-reader',
    },
    identity: {
      accountId: mockState.profile.accountId,
      profileId: mockState.profile.id,
      role: 'reader',
    },
    onboarding: clone(mockState.profile.onboarding),
    profile: clone(mockState.profile),
    refreshToken: `${mockState.sessionToken}-refresh`,
  };
}

export function mockLoginSession(identifier: string): SessionPayload {
  mockState.sessionToken = `mock-${identifier || 'reader'}-token`;
  return createMockSessionPayload();
}

export function mockRegisterSession(username: string, displayName: string): SessionPayload {
  mockState.sessionToken = `mock-${username || 'reader'}-token`;
  mockState.profile = {
    ...mockState.profile,
    displayName,
    onboarding: {
      completed: false,
      needsInterestSelection: true,
      needsProfileBinding: true,
    },
  };
  return createMockSessionPayload();
}

export function getMockSessionMe(): SessionPayload {
  return createMockSessionPayload();
}

export function updateMockProfile(
  payload: Partial<StudentProfile> & { interestTags?: string[] }
): SessionPayload {
  const nextProfile = {
    ...mockState.profile,
    ...payload,
    interestTags: payload.interestTags ?? mockState.profile.interestTags,
  };
  mockState.profile = {
    ...nextProfile,
    onboarding: {
      completed:
        Boolean(nextProfile.college && nextProfile.major && nextProfile.gradeYear) &&
        Boolean(nextProfile.interestTags.length),
      needsInterestSelection: nextProfile.interestTags.length === 0,
      needsProfileBinding: Boolean(!nextProfile.college || !nextProfile.major || !nextProfile.gradeYear),
    },
  };
  return createMockSessionPayload();
}

export function listMockBooks(query?: string): BookCard[] {
  const clean = (query ?? '').trim().toLowerCase();
  if (!clean) {
    return clone(bookCatalog);
  }
  return clone(
    bookCatalog.filter((book) =>
      [book.title, book.author, book.summary, book.tags.join(','), book.category ?? '']
        .join(' ')
        .toLowerCase()
        .includes(clean)
    )
  );
}

export function getMockBook(bookId: number): BookCard | null {
  return clone(bookCatalog.find((book) => book.id === bookId) ?? null);
}

export function getMockBookDetail(bookId: number): BookDetail | null {
  const book = bookCatalog.find((item) => item.id === bookId);
  if (!book) {
    return null;
  }

  return {
    catalog: {
      ...clone(book),
      contents: ['第 1 章 概述', '第 2 章 核心概念', '第 3 章 实践案例'],
      locationNote: `${book.shelfLabel} · ${book.cabinetLabel}`,
    },
    peopleAlsoBorrowed: clone(bookCatalog.filter((item) => item.id !== bookId).slice(0, 3)),
    recommendationReason: book.recommendationReason,
    relatedBooks: clone(bookCatalog.filter((item) => item.id !== bookId).slice(0, 2)),
  };
}

export function getMockHomeFeed(): RecommendationFeed {
  return clone(defaultFeed);
}

export function listMockOrders(): BorrowOrderView[] {
  return clone(mockState.orders);
}

export function getMockOrder(orderId: number): BorrowOrderView | null {
  return clone(mockState.orders.find((order) => order.id === orderId) ?? null);
}

export function renewMockOrder(orderId: number): BorrowOrderView | null {
  const order = mockState.orders.find((item) => item.id === orderId);
  if (!order) {
    return null;
  }

  order.renewable = false;
  order.actionableLabel = '已续借';
  order.statusLabel = '已续借';
  order.note = `${order.note} · 已续借`;
  return clone(order);
}

export function createMockBorrowOrder(
  bookId: number,
  options: { deliveryTarget?: string; mode?: BorrowOrderView['mode'] } = {}
): BorrowOrderView {
  const book = getMockBook(bookId) ?? bookLearning;
  const nextOrder: BorrowOrderView = {
    actionableLabel: '去续借',
    book,
    cancellable: true,
    dueDateLabel: '7 天后到期',
    fulfillmentPhase: options.mode === 'cabinet_pickup' ? 'pickup_pending' : 'dispatch_started',
    id: Date.now(),
    mode: options.mode ?? 'robot_delivery',
    note: options.deliveryTarget
      ? `模拟下单成功，目标地点：${options.deliveryTarget}`
      : '模拟下单成功，页面已回填到本地状态。',
    renewable: true,
    returnable: false,
    status: 'active',
    statusLabel: options.mode === 'cabinet_pickup' ? '待取书' : '正在配送',
    timeline: [
      { completed: true, label: '待取书' },
      ...(options.mode === 'cabinet_pickup'
        ? [{ completed: false, label: '书柜出书中' }]
        : [{ completed: true, label: '机器人配送中' }]),
    ],
  };
  mockState.orders = [nextOrder, ...mockState.orders];
  return clone(nextOrder);
}

export function listMockFavorites(): FavoriteBook[] {
  return clone(mockState.favorites);
}

export function toggleMockFavorite(bookId: number): FavoriteBook[] {
  const existing = mockState.favorites.find((item) => item.book.id === bookId);
  if (existing) {
    mockState.favorites = mockState.favorites.filter((item) => item.book.id !== bookId);
    return clone(mockState.favorites);
  }

  const book = getMockBook(bookId) ?? bookLearning;
  mockState.favorites = [
    ...mockState.favorites,
    { id: `fav-${bookId}`, book, createdAt: new Date().toISOString() },
  ];
  return clone(mockState.favorites);
}

export function listMockBooklists(): BooklistSummary[] {
  return clone(mockState.booklists);
}

export function createMockBooklist(title: string, description: string | null, bookIds: number[]): BooklistSummary {
  const nextBooklist: BooklistSummary = {
    books: bookIds.map((bookId) => getMockBook(bookId) ?? bookLearning),
    description,
    id: `${title}-${mockState.booklists.length + 1}`,
    source: 'custom',
    title,
  };
  mockState.booklists = [nextBooklist, ...mockState.booklists];
  return clone(nextBooklist);
}

export function listMockNotifications(): NotificationItem[] {
  return clone(mockState.notifications);
}

export function getMockAchievements(): AchievementSummary {
  return clone(mockState.achievements);
}

export function getMockSessionProfile() {
  return clone(mockState.profile);
}
