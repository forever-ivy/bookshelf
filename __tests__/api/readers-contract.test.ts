import { updateMyProfile } from '@/lib/api/readers';

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
});
