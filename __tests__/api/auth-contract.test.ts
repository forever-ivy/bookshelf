import { getMe, login, registerReader } from '@/lib/api/auth';

describe('auth contract', () => {
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

  it('posts the approved username login payload with the reader role', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        access_token: 'reader-token',
        account: {
          id: 1,
          role: 'reader',
          username: 'student-reader',
        },
        identity: {
          accountId: 1,
          profileId: 1,
          role: 'reader',
        },
        onboarding: {
          completed: true,
          needsInterestSelection: false,
          needsProfileBinding: false,
        },
        profile: {
          account_id: 1,
          affiliation_type: 'student',
          college: '信息与电气工程学院',
          display_name: '陈知行',
          grade_year: '2023',
          id: 1,
          interest_tags: ['AI'],
          major: '人工智能',
          reading_profile_summary: '偏好先看章节框架，再进入细节和例题。',
        },
      }),
      ok: true,
    });

    await login({ password: 'reader-pass', username: 'reader-home' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v1/auth/login'
    );
    expect(
      JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))
    ).toEqual({
      password: 'reader-pass',
      role: 'reader',
      username: 'reader-home',
    });
  });

  it('posts the reader registration payload to the dedicated register endpoint', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        access_token: 'reader-token',
        account: {
          id: 2,
          role: 'reader',
          username: 'new-reader',
        },
        profile: {
          account_id: 2,
          affiliation_type: 'student',
          college: '信息学院',
          display_name: '新同学',
          grade_year: '2026',
          id: 2,
          interest_tags: ['AI', '推荐系统'],
          major: '数据科学',
          reading_profile_summary: null,
        },
        refresh_token: 'reader-refresh',
      }),
      ok: true,
    });

    await registerReader({
      college: '信息学院',
      displayName: '新同学',
      gradeYear: '2026',
      interestTags: ['AI', '推荐系统'],
      major: '数据科学',
      password: 'reader-pass',
      username: 'new-reader',
    });

    expect((global.fetch as jest.Mock).mock.calls[0]?.[0]).toBe(
      'https://library.example/api/v1/auth/register/reader'
    );
    expect(
      JSON.parse(String((global.fetch as jest.Mock).mock.calls[0]?.[1]?.body))
    ).toEqual({
      college: '信息学院',
      display_name: '新同学',
      grade_year: '2026',
      interest_tags: ['AI', '推荐系统'],
      major: '数据科学',
      password: 'reader-pass',
      username: 'new-reader',
    });
  });

  it('keeps profile empty when auth me reports an account without a bound reader profile', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      json: async () => ({
        account: {
          id: 1,
          role: 'reader',
          username: 'student-reader',
        },
        account_id: 1,
        profile: null,
        profile_id: null,
        role: 'reader',
      }),
      ok: true,
    });

    const session = await getMe('reader-token');

    expect(session.profile).toBeNull();
    expect(session.onboarding).toEqual({
      completed: false,
      needsInterestSelection: true,
      needsProfileBinding: true,
    });
    expect(session.accessToken).toBe('reader-token');
  });
});
