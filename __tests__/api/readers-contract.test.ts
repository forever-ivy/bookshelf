import { getMyOverview, updateMyProfile } from '@/lib/api/readers';

describe('readers contract', () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = 'https://library.example';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_LIBRARY_SERVICE_URL = originalBaseUrl;
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('normalizes a profile-only update response into profile plus onboarding state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        profile: {
          account_id: 1,
          affiliation_type: 'student',
          college: '信息与电气工程学院',
          display_name: '陈知行',
          grade_year: '2023',
          id: 1,
          interest_tags: ['AI', '课程配套', '考试复习'],
          major: '人工智能',
          reading_profile_summary: '偏好先看章节框架，再进入细节和例题。',
        },
      }),
      ok: true,
    });

    const result = await updateMyProfile('reader-token', {
      displayName: '陈知行',
      gradeYear: '2023',
      major: '人工智能',
    });

    expect(result.profile).toMatchObject({
      accountId: 1,
      affiliationType: 'student',
      college: '信息与电气工程学院',
      displayName: '陈知行',
      gradeYear: '2023',
      id: 1,
      interestTags: ['AI', '课程配套', '考试复习'],
      major: '人工智能',
    });
    expect(result.onboarding).toEqual({
      completed: true,
      needsInterestSelection: false,
      needsProfileBinding: false,
    });
  });

  it('normalizes reader overview stats and recent items for the me dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        overview: {
          profile: {
            account_id: 1,
            affiliation_type: 'student',
            college: '信息学院',
            display_name: '陈知行',
            grade_year: '2023',
            id: 1,
            interest_tags: ['AI'],
            major: '人工智能',
            reading_profile_summary: '偏好先看章节框架。',
          },
          recent_orders: [
            {
              book: {
                author: '周志华',
                id: 8,
                title: '机器学习',
              },
              id: 88,
              status: 'completed',
              timeline: [{ completed: true, label: '已完成' }],
            },
          ],
          recent_queries: ['机器学习', '推荐系统'],
          stats: {
            active_orders_count: 2,
            borrow_history_count: 9,
            conversation_count: 0,
            last_active_at: '2026-03-29T12:00:00Z',
            reading_event_count: 3,
            recommendation_count: 4,
            search_count: 12,
          },
        },
      }),
      ok: true,
    });

    const result = await getMyOverview('reader-token');

    expect(result.profile).toMatchObject({
      accountId: 1,
      displayName: '陈知行',
      major: '人工智能',
    });
    expect(result.stats).toMatchObject({
      activeOrdersCount: 2,
      borrowHistoryCount: 9,
      searchCount: 12,
    });
    expect(result.recentQueries).toEqual(['机器学习', '推荐系统']);
    expect(result.recentOrders[0]).toMatchObject({
      id: 88,
      status: 'completed',
    });
  });
});
