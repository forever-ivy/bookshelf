import type {
  AccountSummary,
  BadgeSummary,
  BookSummary,
  BooklistItem,
  BorrowLog,
  CabinetCompartment,
  FamilyDetail,
  FamilySummary,
  MemberGoal,
  MemberStats,
  MemberSummary,
  MonthlyReport,
  ReadingEvent,
  WeeklyReport,
} from '@/lib/api/contracts/types';
import { createConnectionProfile } from '@/lib/app/connection';

const previewUsers: MemberSummary[] = [
  {
    age: 38,
    avatar: '妈',
    family_name: '暮光阅读家',
    color: 'cool',
    interests: '亲子共读、自然故事',
    id: 1,
    name: '妈妈',
    pin: '0000',
    role: 'parent',
  },
  {
    age: 8,
    avatar: '米',
    family_name: '暮光阅读家',
    color: 'forest',
    current_goal_minutes: 20,
    current_streak_days: 6,
    grade_level: '小学二年级',
    id: 2,
    interests: '冒险故事、自然观察',
    name: '米洛',
    role: 'child',
  },
  {
    age: 6,
    avatar: '艾',
    family_name: '暮光阅读家',
    color: 'sun',
    current_goal_minutes: 15,
    current_streak_days: 3,
    grade_level: '学前班',
    id: 3,
    interests: '建筑、图画书',
    name: '艾玛',
    role: 'child',
  },
];

const previewCompartments: CabinetCompartment[] = [
  { book: 'Where the Forest Meets the Sea', cid: 1, status: 'occupied', x: 0, y: 0 },
  { book: 'Moonlight Library', cid: 2, status: 'occupied', x: 1, y: 0 },
  { book: null, cid: 3, status: 'free', x: 2, y: 0 },
  { book: 'The Little Architect', cid: 4, status: 'occupied', x: 0, y: 1 },
  { book: 'Cloud Atlas for Kids', cid: 5, status: 'occupied', x: 1, y: 1 },
  { book: null, cid: 6, status: 'free', x: 2, y: 1 },
];

const previewBorrowLogsByMember: Record<number, BorrowLog[]> = {
  1: [
    { action: '查看报告', action_time: '今天 · 19:30', title: '本周阅读总结' },
    { action: '已分享', action_time: '昨天 · 09:10', title: '米洛的连续阅读记录' },
  ],
  2: [
    { action: '借出', action_time: '今天 · 18:40', title: '月光图书馆' },
    { action: '归还', action_time: '昨天 · 20:15', title: '森林与海相遇的地方' },
    { action: '借出', action_time: '周二 · 17:20', title: '给孩子的云图集' },
  ],
  3: [
    { action: '借出', action_time: '今天 · 16:05', title: '小小建筑师' },
    { action: '归还', action_time: '周一 · 18:50', title: '月光图书馆' },
  ],
};

const previewBooklistByMember: Record<number, BooklistItem[]> = {
  1: [
    {
      created_at: '2026-03-10T09:00:00.000Z',
      done: false,
      id: 101,
      note: '周末家庭共读时可以先从这里开始。',
      title: '一起读的故事',
    },
  ],
  2: [
    {
      created_at: '2026-03-11T08:30:00.000Z',
      done: false,
      id: 201,
      note: '今晚睡前继续读下一章。',
      title: '月光图书馆',
    },
    {
      created_at: '2026-03-09T18:00:00.000Z',
      done: true,
      id: 202,
      note: '已经读完，还拿到了笑脸贴纸。',
      title: '森林与海相遇的地方',
    },
    {
      created_at: '2026-03-08T11:00:00.000Z',
      done: false,
      id: 203,
      note: '已经排进周六早上的阅读清单。',
      title: '给孩子的云图集',
    },
  ],
  3: [
    {
      created_at: '2026-03-11T08:00:00.000Z',
      done: false,
      id: 301,
      note: '今晚试着大声读两页。',
      title: '小小建筑师',
    },
  ],
};

const previewStatsByMember: Record<number, MemberStats> = {
  1: {
    goal_reached: true,
    recent: previewBorrowLogsByMember[1],
    today_ops: 2,
    total_store: 18,
    total_take: 24,
    weekly_goal: 4,
    weekly_takes: 4,
  },
  2: {
    goal_reached: true,
    recent: previewBorrowLogsByMember[2],
    today_ops: 3,
    total_store: 22,
    total_take: 29,
    weekly_goal: 5,
    weekly_takes: 4,
  },
  3: {
    goal_reached: false,
    recent: previewBorrowLogsByMember[3],
    today_ops: 1,
    total_store: 10,
    total_take: 13,
    weekly_goal: 4,
    weekly_takes: 2,
  },
};

const previewBadgesByMember: Record<number, BadgeSummary[]> = {
  1: [{ badge_key: '家庭领读者', unlocked_at: '2026-03-01T10:00:00.000Z' }],
  2: [
    { badge_key: '连续阅读达人', unlocked_at: '2026-03-08T10:00:00.000Z' },
    { badge_key: '好奇小读者', unlocked_at: '2026-03-10T10:00:00.000Z' },
  ],
  3: [{ badge_key: '翻页小能手', unlocked_at: '2026-03-05T10:00:00.000Z' }],
};

const previewWeeklyReports: Record<number, WeeklyReport> = {
  1: {
    books: ['家庭共读笔记'],
    summary: '妈妈这周持续维持家庭阅读节奏，还和家人分享了两次阅读反馈。',
  },
  2: {
    books: ['月光图书馆', '给孩子的云图集'],
    summary: '米洛这周借了 4 本书，保持了稳定的连续阅读，还读完了一本最喜欢的睡前故事。',
  },
  3: {
    books: ['小小建筑师'],
    summary: '艾玛正在通过更短的每日阅读慢慢建立节奏，也越来越敢于开口朗读了。',
  },
};

const previewMonthlyReport: MonthlyReport = {
  most_active: '米洛',
  summary:
    '这个月全家一共借阅了 18 本书，米洛的阅读节奏最稳定，自然主题故事也成了最受欢迎的书架分类。',
  top_category: '自然故事',
  total_books: 18,
};

const previewGoalsByMember: Record<number, MemberGoal> = {
  1: {
    user_id: 1,
    weekly_target: 4,
  },
  2: {
    user_id: 2,
    weekly_target: 5,
  },
  3: {
    user_id: 3,
    weekly_target: 4,
  },
};

const previewAccounts: AccountSummary[] = [
  {
    id: 1,
    linked_user_count: 3,
    owned_family_count: 1,
    phone: '13800000000',
    status: 'active',
    system_role: 'admin',
    username: 'preview-admin',
  },
  {
    id: 2,
    linked_user_count: 1,
    owned_family_count: 0,
    phone: null,
    status: 'active',
    system_role: 'user',
    username: 'preview-reader',
  },
];

const previewFamilySummary: FamilySummary = {
  family_name: '暮光阅读家',
  id: 1,
  member_count: previewUsers.length,
  owner_account_id: 1,
  owner_username: 'preview-admin',
};

const previewFamilyDetail: FamilyDetail = {
  ...previewFamilySummary,
  members: previewUsers.map((member) => ({
    avatar: member.avatar,
    color: member.color,
    id: member.id,
    name: member.name,
    role: member.role,
  })),
};

const previewBooks: BookSummary[] = [
  {
    author: 'Lin Yue',
    category: '自然故事',
    id: 401,
    is_on_shelf: true,
    on_shelf_count: 1,
    title: 'Where the Forest Meets the Sea',
  },
  {
    author: 'Aster Chen',
    category: '幻想冒险',
    id: 402,
    is_on_shelf: true,
    on_shelf_count: 1,
    title: 'Moonlight Library',
  },
  {
    author: 'Mina Park',
    category: '科普',
    id: 403,
    is_on_shelf: false,
    on_shelf_count: 0,
    title: 'Cloud Atlas for Kids',
  },
];

const previewReadingEvents: ReadingEvent[] = [
  {
    book_id: 402,
    book_title: 'Moonlight Library',
    event_time: '2026-03-15T19:20:00.000Z',
    event_type: 'take',
    id: 7001,
    source: 'app',
    user_id: 2,
    user_name: '米洛',
  },
  {
    book_id: 401,
    book_title: 'Where the Forest Meets the Sea',
    event_time: '2026-03-14T17:00:00.000Z',
    event_type: 'finish',
    id: 7002,
    source: 'parent-note',
    user_id: 2,
    user_name: '米洛',
  },
];

export function createPreviewConnectionProfile() {
  return createConnectionProfile('preview://cabinet', '预览书柜');
}

export function getPreviewCabinetData() {
  return {
    accounts: previewAccounts,
    badgesByMember: previewBadgesByMember,
    booklistByMember: previewBooklistByMember,
    books: previewBooks,
    compartments: previewCompartments,
    connection: createPreviewConnectionProfile(),
    currentUser: previewUsers[1],
    familyDetail: previewFamilyDetail,
    familySummary: previewFamilySummary,
    families: [previewFamilySummary],
    monthlyReport: previewMonthlyReport,
    readingEvents: previewReadingEvents,
    stats: previewStatsByMember[2],
    statsByMember: previewStatsByMember,
    users: previewUsers,
    weeklyReport: previewWeeklyReports[2],
    weeklyReportsByMember: previewWeeklyReports,
    borrowLogsByMember: previewBorrowLogsByMember,
    booklist: previewBooklistByMember[2],
    goalsByMember: previewGoalsByMember,
  };
}
