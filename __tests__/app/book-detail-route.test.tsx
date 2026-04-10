import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

let mockDetailLoading = false;
let mockCollaborativeLoading = false;
let mockSimilarLoading = false;
let mockHybridLoading = false;
let mockSearchParams: Record<string, string | undefined> = { bookId: '1' };
let mockActiveOrdersData: Array<Record<string, unknown>> = [];
let mockCollaborativeBooksData = [
  {
    author: 'Ian Goodfellow',
    availabilityLabel: '馆藏充足 · 可立即借阅',
    cabinetLabel: '主馆 2 楼',
    coverTone: 'blue',
    deliveryAvailable: false,
    etaLabel: '到柜自取',
    etaMinutes: null,
    id: 2,
    matchedFields: ['title'],
    recommendationReason: '如果你在做深度学习专题，它会更系统',
    shelfLabel: '主馆 2 楼',
    stockStatus: 'limited',
    summary: '适合继续拓展模型与训练方法。',
    tags: ['深度学习'],
    title: 'Deep Learning',
  },
];
let mockSimilarBooksData = [
  {
    author: '格致',
    availabilityLabel: '馆藏充足 · 可立即借阅',
    cabinetLabel: '默认书柜',
    coverTone: 'mint',
    deliveryAvailable: true,
    etaLabel: '明早可达',
    etaMinutes: 480,
    id: 3,
    matchedFields: ['title'],
    recommendationReason: '偏兴趣阅读，适合碎片时间浏览',
    shelfLabel: '主馆 2 楼',
    stockStatus: 'available',
    summary: '适合兴趣阅读和跨学科补充。',
    tags: ['心理学'],
    title: '心理学入门',
  },
];
let mockHybridBooksData = [
  {
    author: '李航',
    availabilityLabel: '馆藏充足 · 可立即借阅',
    cabinetLabel: '智能书柜 B-02',
    coverTone: 'coral',
    deliveryAvailable: true,
    etaLabel: '12 分钟可送达',
    etaMinutes: 12,
    id: 4,
    matchedFields: ['title'],
    recommendationReason: '综合你的课程与借阅轨迹生成',
    shelfLabel: '主馆 3 楼',
    stockStatus: 'available',
    summary: '适合进一步补齐统计学习方法。',
    tags: ['统计学习'],
    title: '统计学习方法',
  },
];

function createMockBookDetailData() {
  return {
    catalog: {
      author: '周志华',
      availabilityLabel: '馆藏充足 · 可立即借阅',
      cabinetLabel: '智能书柜 A-03',
      contents: ['第 1 章 概述', '第 2 章 核心概念'],
      coverTone: 'lavender',
      deliveryAvailable: true,
      etaLabel: '18 分钟可送达',
      etaMinutes: 18,
      id: 1,
      locationNote: '主馆 2 楼 · 智能书柜 A-03',
      matchedFields: ['title'],
      recommendationReason: '与你本周的课程和 AI 学习记录最相关',
      shelfLabel: '主馆 2 楼',
      stockStatus: 'available',
      summary: '适合课程导读和期末复习的入门书。',
      tags: ['人工智能', '课程配套'],
      title: '机器学习从零到一',
    },
    peopleAlsoBorrowed: [
      {
        author: 'Ian Goodfellow',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '主馆 2 楼',
        coverTone: 'blue',
        deliveryAvailable: false,
        etaLabel: '到柜自取',
        etaMinutes: null,
        id: 2,
        matchedFields: ['title'],
        recommendationReason: '如果你在做深度学习专题，它会更系统',
        shelfLabel: '主馆 2 楼',
        stockStatus: 'limited',
        summary: '适合继续拓展模型与训练方法。',
        tags: ['深度学习'],
        title: 'Deep Learning',
      },
    ],
    recommendationReason: '与你本周的课程和 AI 学习记录最相关',
    relatedBooks: [
      {
        author: '格致',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '默认书柜',
        coverTone: 'mint',
        deliveryAvailable: true,
        etaLabel: '明早可达',
        etaMinutes: 480,
        id: 3,
        matchedFields: ['title'],
        recommendationReason: '偏兴趣阅读，适合碎片时间浏览',
        shelfLabel: '主馆 2 楼',
        stockStatus: 'available',
        summary: '适合兴趣阅读和跨学科补充。',
        tags: ['心理学'],
        title: '心理学入门',
      },
    ],
  };
}

let mockBookDetailData = createMockBookDetailData();

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
const mockOpenProfileSheet = jest.fn();
const mockBorrowMutateAsync = jest.fn(async () => ({ id: 101 }));
const mockAddBookToBooklistMutateAsync = jest.fn(async () => ({
  books: [],
  description: '准备晚点读',
  id: 'watch-later',
  source: 'custom',
  title: '稍后再看',
}));

const mockCreateBooklistMutation = {
  isPending: false,
  mutateAsync: jest.fn(async () => ({
    books: [],
    description: '待读清单',
    id: 'later',
    source: 'custom',
    title: '稍后阅读',
  })),
};
const mockCreateTutorProfileMutateAsync = jest.fn(async () => ({
  bookId: 1,
  createdAt: '2026-04-08T08:00:00Z',
  curriculum: [],
  id: 901,
  persona: {
    greeting: '我们一步步来。',
    name: '周老师',
  },
  sourceType: 'book',
  status: 'ready',
  title: '机器学习从零到一',
  updatedAt: '2026-04-08T08:00:00Z',
}));
const mockBooklistsQueryData = {
  customItems: [
    {
      books: [],
      description: '准备晚点读',
      id: 'watch-later',
      source: 'custom' as const,
      title: '稍后再看',
    },
    {
      books: [],
      description: '算法课补充',
      id: 'algorithms',
      source: 'custom' as const,
      title: '算法复习',
    },
  ],
  systemItems: [],
};

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    Easing: {
      ease: 'ease',
      inOut: (value: unknown) => value,
    },
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withRepeat: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children),
    },
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  const LinkPreview = () => null;
  LinkPreview.displayName = 'LinkPreview';
  const LinkTrigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  LinkTrigger.displayName = 'LinkTrigger';
  Link.Preview = LinkPreview;
  Link.Trigger = LinkTrigger;

  return {
    Link,
    Redirect: ({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
    useLocalSearchParams: () => mockSearchParams,
    usePathname: () => '/books/1',
    useRouter: () => mockRouter,
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    clearSession: jest.fn(),
    identity: {
      accountId: 1,
      profileId: 1,
      role: 'reader',
    },
    isAuthenticated: true,
    onboarding: {
      completed: true,
      needsInterestSelection: false,
      needsProfileBinding: false,
    },
    profile: {
      accountId: 1,
      affiliationType: 'student',
      college: '信息与电气工程学院',
      displayName: '陈知行',
      gradeYear: '2023',
      id: 1,
      interestTags: ['AI'],
      major: '人工智能',
      onboarding: {
        completed: true,
        needsInterestSelection: false,
        needsProfileBinding: false,
      },
      readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
    },
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useActiveOrdersQuery: () => ({
    data: mockActiveOrdersData,
    error: null,
    isFetching: false,
  }),
  useBookDetailQuery: () => ({
    data: mockDetailLoading ? undefined : mockBookDetailData,
    isFetching: mockDetailLoading,
  }),
  useBooklistsQuery: () => ({
    data: mockBooklistsQueryData,
    error: null,
    isFetching: false,
  }),
  useAddBookToBooklistMutation: () => ({
    isPending: false,
    mutateAsync: mockAddBookToBooklistMutateAsync,
  }),
  useCreateBooklistMutation: () => mockCreateBooklistMutation,
  useCreateBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: mockBorrowMutateAsync,
  }),
  useCollaborativeBooksQuery: () => ({
    data: mockCollaborativeLoading ? undefined : mockCollaborativeBooksData,
    error: null,
    isFetching: mockCollaborativeLoading,
  }),
  useCreateTutorProfileMutation: () => ({
    isPending: false,
    mutateAsync: mockCreateTutorProfileMutateAsync,
  }),
  useFavoritesQuery: () => ({
    data: [
      {
        book: { id: 1 },
        id: 'fav-1',
      },
    ],
  }),
  useHybridBooksQuery: () => ({
    data: mockHybridLoading ? undefined : mockHybridBooksData,
    error: null,
    isFetching: mockHybridLoading,
  }),
  useSimilarBooksQuery: () => ({
    data: mockSimilarLoading ? undefined : mockSimilarBooksData,
    error: null,
    isFetching: mockSimilarLoading,
  }),
  useToggleFavoriteMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(async () => []),
  }),
}));

jest.mock('@/providers/profile-sheet-provider', () => ({
  useProfileSheet: () => ({
    closeProfileSheet: jest.fn(),
    isProfileSheetOpen: false,
    openProfileSheet: mockOpenProfileSheet,
  }),
}));

import { toast } from 'sonner-native';
import BookDetailRoute from '@/app/books/[bookId]';
import { appTheme } from '@/constants/app-theme';

describe('BookDetailRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveOrdersData = [];
    mockDetailLoading = false;
    mockCollaborativeLoading = false;
    mockSimilarLoading = false;
    mockHybridLoading = false;
    mockCollaborativeBooksData = [
      {
        author: 'Ian Goodfellow',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '主馆 2 楼',
        coverTone: 'blue',
        deliveryAvailable: false,
        etaLabel: '到柜自取',
        etaMinutes: null,
        id: 2,
        matchedFields: ['title'],
        recommendationReason: '如果你在做深度学习专题，它会更系统',
        shelfLabel: '主馆 2 楼',
        stockStatus: 'limited',
        summary: '适合继续拓展模型与训练方法。',
        tags: ['深度学习'],
        title: 'Deep Learning',
      },
    ];
    mockSimilarBooksData = [
      {
        author: '格致',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '默认书柜',
        coverTone: 'mint',
        deliveryAvailable: true,
        etaLabel: '明早可达',
        etaMinutes: 480,
        id: 3,
        matchedFields: ['title'],
        recommendationReason: '偏兴趣阅读，适合碎片时间浏览',
        shelfLabel: '主馆 2 楼',
        stockStatus: 'available',
        summary: '适合兴趣阅读和跨学科补充。',
        tags: ['心理学'],
        title: '心理学入门',
      },
    ];
    mockHybridBooksData = [
      {
        author: '李航',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '智能书柜 B-02',
        coverTone: 'coral',
        deliveryAvailable: true,
        etaLabel: '12 分钟可送达',
        etaMinutes: 12,
        id: 4,
        matchedFields: ['title'],
        recommendationReason: '综合你的课程与借阅轨迹生成',
        shelfLabel: '主馆 3 楼',
        stockStatus: 'available',
        summary: '适合进一步补齐统计学习方法。',
        tags: ['统计学习'],
        title: '统计学习方法',
      },
    ];
    mockBookDetailData = createMockBookDetailData();
    mockSearchParams = { bookId: '1' };
  });

  it('uses a single detail skeleton with discovery grouped in the lower half', () => {
    render(<BookDetailRoute />);

    expect(screen.getByText('图书详情')).toBeTruthy();
    expect(screen.queryByText('先看清这本书，再决定要不要借。')).toBeNull();
    expect(screen.getByText('借阅决策')).toBeTruthy();
    expect(screen.getByText('主馆 2 楼 · 智能书柜 A-03')).toBeTruthy();
    expect(screen.getAllByText('可送达').length).toBeGreaterThan(0);
    expect(screen.getByText('内容信息')).toBeTruthy();
    expect(screen.queryByText('目录')).toBeNull();
    expect(screen.getByText('延伸发现')).toBeTruthy();
    expect(screen.getByText('推荐给你')).toBeTruthy();
    expect(screen.getByText('与你本周的课程和 AI 学习记录最相关')).toBeTruthy();
    expect(screen.getByText('借过这本的人也借了')).toBeTruthy();
    expect(screen.getByText('Deep Learning')).toBeTruthy();
    expect(screen.getByText('同主题延伸')).toBeTruthy();
    expect(screen.getByText('心理学入门')).toBeTruthy();
    expect(screen.getByText('你可能还想借')).toBeTruthy();
    expect(screen.getByText('统计学习方法')).toBeTruthy();
    expect(screen.getAllByTestId('book-detail-discovery-chevron').length).toBe(3);
    expect(screen.getByText('已收藏')).toBeTruthy();
    expect(screen.getByText('加入书单')).toBeTruthy();
    expect(screen.queryByTestId('book-detail-request-delivery')).toBeNull();
    expect(screen.queryByTestId('book-detail-pickup-borrow')).toBeNull();
    expect(screen.queryByText('为什么可能适合你')).toBeNull();
    expect(screen.queryByText('同主题图书')).toBeNull();
    expect(screen.queryByText('默认书柜')).toBeNull();
    expect(screen.queryByText('馆藏位置待确认')).toBeNull();
    expect(screen.getByTestId('book-detail-cover-shell').props.style).not.toMatchObject({
      backgroundColor: expect.anything(),
    });
  });

  it('uses a concise availability label and gives the decision buttons a clear visual hierarchy', () => {
    render(<BookDetailRoute />);

    const decisionActions = screen.getByTestId('book-detail-decision-actions');
    const primaryRow = screen.getByTestId('book-detail-decision-primary-row');
    const secondaryRow = screen.getByTestId('book-detail-decision-secondary-row');
    const borrowSlot = screen.getByTestId('book-detail-decision-borrow-slot');
    const favoriteSlot = screen.getByTestId('book-detail-decision-favorite-slot');
    const primaryBorrowSurface = screen.getByTestId('book-detail-decision-borrow-surface');
    const favoriteSurface = screen.getByTestId('book-detail-decision-favorite-surface');
    const booklistSurface = screen.getByTestId('book-detail-decision-booklist-surface');

    expect(screen.getByText('可立即借阅')).toBeTruthy();
    expect(decisionActions.props.style).toEqual(
      expect.objectContaining({
        width: '100%',
      })
    );
    expect(primaryRow.props.style).toEqual(
      expect.objectContaining({
        width: '100%',
      })
    );
    expect(secondaryRow.props.style).toEqual(
      expect.objectContaining({
        width: '100%',
      })
    );
    expect(borrowSlot.props.style).toEqual(
      expect.objectContaining({
        minHeight: 52,
      })
    );
    expect(favoriteSlot.props.style).toEqual(
      expect.objectContaining({
        minHeight: 52,
      })
    );
    expect(primaryBorrowSurface.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: appTheme.colors.primaryStrong,
        borderColor: appTheme.colors.primaryStrong,
        boxShadow: appTheme.shadows.float,
        height: undefined,
      })
    );
    expect(favoriteSurface.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: appTheme.colors.surfaceTint,
        height: undefined,
      })
    );
    expect(booklistSurface.props.style).toEqual(
      expect.objectContaining({
        backgroundColor: appTheme.colors.surface,
        height: undefined,
      })
    );
    expect(screen.getByText('创建学习导师')).toBeTruthy();
  });

  it('creates a tutor from the current book and jumps to the tutor detail page', async () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByTestId('book-detail-create-tutor'));

    await waitFor(() => {
      expect(mockCreateTutorProfileMutateAsync).toHaveBeenCalledWith({
        bookId: 1,
        sourceType: 'book',
        title: '机器学习从零到一',
      });
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/tutor/901');
  });

  it('shows the current book as in transit when there is an active robot delivery order', () => {
    mockActiveOrdersData = [
      {
        book: { id: 1 },
        dueDateLabel: '7 天后到期',
        fulfillmentPhase: 'dispatch_started',
        id: 77,
        mode: 'robot_delivery',
        status: 'active',
        statusLabel: '正在配送',
        timeline: [{ completed: true, label: '下单成功' }],
      },
    ];

    render(<BookDetailRoute />);

    expect(screen.getAllByText('正在配送').length).toBeGreaterThan(0);
    expect(screen.getByText('查看配送')).toBeTruthy();

    fireEvent.press(screen.getByTestId('book-detail-open-borrow-modal'));

    expect(mockRouter.push).toHaveBeenCalledWith('/orders/77');
    expect(screen.queryByTestId('book-detail-borrow-modal')).toBeNull();
  });

  it('shows the current book as borrowed when there is an active delivered order', () => {
    mockActiveOrdersData = [
      {
        book: { id: 1 },
        dueDateLabel: '7 天后到期',
        fulfillmentPhase: 'delivered',
        id: 78,
        mode: 'robot_delivery',
        status: 'active',
        statusLabel: '已送达',
        timeline: [{ completed: true, label: '已送达' }],
      },
    ];

    render(<BookDetailRoute />);

    expect(screen.getAllByText('已借阅').length).toBeGreaterThan(0);
    expect(screen.getByText('查看借阅')).toBeTruthy();
  });

  it('opens the booklist picker and adds the book into the existing watch-later list', async () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByText('加入书单'));

    expect(screen.getByTestId('book-detail-booklist-modal')).toBeTruthy();
    expect(screen.getByText('稍后再看')).toBeTruthy();
    expect(screen.getByText('算法复习')).toBeTruthy();

    fireEvent.press(screen.getByTestId('book-detail-booklist-option-watch-later'));

    await waitFor(() => {
      expect(mockAddBookToBooklistMutateAsync).toHaveBeenCalledWith({
        bookId: 1,
        booklistId: 'watch-later',
      });
    });
    expect(mockCreateBooklistMutation.mutateAsync).not.toHaveBeenCalled();
    expect(mockOpenProfileSheet).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('creates a new custom booklist from the picker and seeds it with the current book', async () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByText('加入书单'));
    fireEvent.press(screen.getByTestId('book-detail-booklist-create-trigger'));
    fireEvent.changeText(screen.getByTestId('book-detail-booklist-title-input'), '课程论文');
    fireEvent.changeText(screen.getByTestId('book-detail-booklist-description-input'), '下周继续看');
    fireEvent.press(screen.getByTestId('book-detail-booklist-submit'));

    await waitFor(() => {
      expect(mockCreateBooklistMutation.mutateAsync).toHaveBeenCalledWith({
        bookIds: [1],
        description: '下周继续看',
        title: '课程论文',
      });
    });
    expect(mockAddBookToBooklistMutateAsync).not.toHaveBeenCalled();
  });

  it('opens a borrow modal, supports switching tabs, and submits the selected borrow mode', async () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByTestId('book-detail-open-borrow-modal'));

    expect(screen.getByTestId('book-detail-borrow-modal')).toBeTruthy();
    expect(screen.queryByTestId('book-detail-borrow-close')).toBeNull();
    expect(screen.getByTestId('book-detail-borrow-tab-robot_delivery')).toBeTruthy();
    expect(screen.getByTestId('book-detail-borrow-tab-cabinet_pickup')).toBeTruthy();
    expect(screen.getByTestId('book-detail-borrow-target-input').props.placeholder).toBe('请输入阅览室座位号');
    expect(screen.getByTestId('book-detail-borrow-target-input').props.value).toBe('');

    fireEvent.press(screen.getByTestId('book-detail-borrow-tab-cabinet_pickup'));
    fireEvent.changeText(screen.getByTestId('book-detail-borrow-target-input'), '主馆 1 楼书柜');
    fireEvent.press(screen.getByTestId('book-detail-borrow-confirm'));

    await waitFor(() => {
      expect(mockBorrowMutateAsync).toHaveBeenCalledWith({
        bookId: 1,
        deliveryTarget: '主馆 1 楼书柜',
        mode: 'cabinet_pickup',
      });
    });
    expect(mockRouter.push).toHaveBeenCalledWith('/orders/101');
  });

  it('requires a seat number before submitting robot delivery', async () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByTestId('book-detail-open-borrow-modal'));
    fireEvent.press(screen.getByTestId('book-detail-borrow-confirm'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('请先输入座位号。');
    });
    expect(mockBorrowMutateAsync).not.toHaveBeenCalled();
  });

  it('blocks borrowing when the current book is unavailable', () => {
    mockBookDetailData = {
      ...createMockBookDetailData(),
      catalog: {
        ...createMockBookDetailData().catalog,
        availabilityLabel: '暂不可借',
        deliveryAvailable: false,
        etaLabel: '到柜自取',
        etaMinutes: 0,
        stockStatus: 'out_of_stock',
      },
    };

    render(<BookDetailRoute />);

    fireEvent.press(screen.getByTestId('book-detail-open-borrow-modal'));

    expect(screen.queryByTestId('book-detail-borrow-modal')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('这本书当前暂不可借，请换一本或稍后再试。');
  });

  it('sanitizes malformed discovery cards instead of crashing the page', () => {
    mockBookDetailData = {
      ...createMockBookDetailData(),
      peopleAlsoBorrowed: [],
      relatedBooks: [],
    };
    mockCollaborativeBooksData = [
      {
        author: { name: 'not-a-string' },
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: { zone: 'A-01' },
        coverTone: 'unknown-tone',
        deliveryAvailable: true,
        etaLabel: { label: 'soon' },
        etaMinutes: null,
        id: undefined,
        matchedFields: [],
        recommendationReason: { detail: 'not-a-string' },
        shelfLabel: null,
        stockStatus: 'available',
        summary: '摘要',
        tags: [],
        title: { text: '坏数据' },
      },
    ] as any;

    render(<BookDetailRoute />);

    expect(screen.getByText('借过这本的人也借了')).toBeTruthy();
    expect(screen.getByText('未命名图书')).toBeTruthy();
    expect(screen.getByText('猜你感兴趣')).toBeTruthy();
    expect(screen.getByText('佚名')).toBeTruthy();
  });

  it('renders the borrow modal as a centered dialog instead of a bottom sheet', () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByTestId('book-detail-open-borrow-modal'));

    const modalSheet = screen.getByTestId('book-detail-borrow-modal');
    const modalActions = screen.getByTestId('book-detail-borrow-actions');
    expect(modalSheet.props.onMoveShouldSetResponder).toBeUndefined();
    expect(modalSheet.props.onResponderGrant).toBeUndefined();
    expect(modalSheet.props.style).toEqual(
      expect.objectContaining({
        alignSelf: 'center',
        width: '100%',
      })
    );
    expect(modalActions.props.style).toEqual(
      expect.objectContaining({
        alignSelf: 'center',
        width: '100%',
      })
    );
  });

  it('shows the borrow modal content without an internal height cap', () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByTestId('book-detail-open-borrow-modal'));

    const modalSheet = screen.getByTestId('book-detail-borrow-modal');

    expect(modalSheet.props.style.maxHeight).toBeUndefined();
  });

  it('hides discovery modules on the minimal detail variant', () => {
    mockSearchParams = { bookId: '1', minimal: 'true' };

    render(<BookDetailRoute />);

    expect(screen.getByText('借阅决策')).toBeTruthy();
    expect(screen.getByText('内容信息')).toBeTruthy();
    expect(screen.queryByText('延伸发现')).toBeNull();
    expect(screen.queryByText('推荐给你')).toBeNull();
    expect(screen.queryByText('借过这本的人也借了')).toBeNull();
    expect(screen.queryByText('同主题延伸')).toBeNull();
    expect(screen.queryByText('你可能还想借')).toBeNull();
  });

  it('keeps the unified sections mounted with skeletons while loading', () => {
    mockDetailLoading = true;
    mockCollaborativeLoading = true;
    mockSimilarLoading = true;
    mockHybridLoading = true;

    render(<BookDetailRoute />);

    expect(screen.getByText('借阅决策')).toBeTruthy();
    expect(screen.getByText('内容信息')).toBeTruthy();
    expect(screen.getByText('延伸发现')).toBeTruthy();
    expect(screen.getByTestId('book-detail-primary-skeleton')).toBeTruthy();
    expect(screen.getByTestId('book-detail-content-skeleton')).toBeTruthy();
    expect(screen.getByTestId('book-detail-discovery-skeleton')).toBeTruthy();
    expect(screen.queryByText('机器学习从零到一')).toBeNull();
  });
});
