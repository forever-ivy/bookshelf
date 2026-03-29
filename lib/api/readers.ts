import type { OnboardingState, StudentProfile } from '@/lib/api/types';
import { libraryRequest } from '@/lib/api/client';
import { getMockSessionMe, updateMockProfile } from '@/lib/api/mock';

export type ProfileUpdateInput = Partial<
  Pick<StudentProfile, 'college' | 'major' | 'gradeYear' | 'displayName'>
> & {
  interestTags?: string[];
  readingProfileSummary?: string | null;
};

export type ReaderProfileSnapshot = {
  onboarding: OnboardingState;
  profile: StudentProfile | null;
};

type ProfileNormalizationOptions = {
  accountId?: number | null;
};

type RawOnboarding = Partial<OnboardingState> | null | undefined;

function hasBooleanOnboarding(value: RawOnboarding): value is OnboardingState {
  return Boolean(
    value &&
      typeof value.completed === 'boolean' &&
      typeof value.needsInterestSelection === 'boolean' &&
      typeof value.needsProfileBinding === 'boolean'
  );
}

function readInterestTags(raw: any): string[] {
  const tags = raw?.interest_tags ?? raw?.interestTags;
  return Array.isArray(tags) ? tags : [];
}

export function deriveOnboardingState(
  rawProfile: any,
  provided?: RawOnboarding
): OnboardingState {
  if (hasBooleanOnboarding(provided)) {
    return {
      completed: provided.completed,
      needsInterestSelection: provided.needsInterestSelection,
      needsProfileBinding: provided.needsProfileBinding,
    };
  }

  const college = rawProfile?.college ?? null;
  const major = rawProfile?.major ?? null;
  const gradeYear = rawProfile?.grade_year ?? rawProfile?.gradeYear ?? null;
  const interestTags = readInterestTags(rawProfile);
  const needsProfileBinding = Boolean(!college || !major || !gradeYear);
  const needsInterestSelection = interestTags.length === 0;

  return {
    completed: !needsProfileBinding && !needsInterestSelection,
    needsInterestSelection,
    needsProfileBinding,
  };
}

export function normalizeStudentProfile(
  rawProfile: any,
  options: ProfileNormalizationOptions = {}
): StudentProfile | null {
  if (!rawProfile) {
    return null;
  }

  const accountId = rawProfile.account_id ?? rawProfile.accountId ?? options.accountId ?? 1;
  const onboarding = deriveOnboardingState(rawProfile, rawProfile.onboarding);

  return {
    accountId,
    affiliationType: rawProfile.affiliation_type ?? rawProfile.affiliationType ?? 'student',
    college: rawProfile.college ?? null,
    displayName: rawProfile.display_name ?? rawProfile.displayName ?? '学生用户',
    gradeYear: rawProfile.grade_year ?? rawProfile.gradeYear ?? null,
    id: rawProfile.id,
    interestTags: readInterestTags(rawProfile),
    major: rawProfile.major ?? null,
    onboarding,
    readingProfileSummary:
      rawProfile.reading_profile_summary ?? rawProfile.readingProfileSummary ?? null,
  };
}

export function normalizeReaderProfilePayload(
  payload: any,
  options: ProfileNormalizationOptions = {}
): ReaderProfileSnapshot {
  const hasOwn = (key: string) =>
    Boolean(payload && Object.prototype.hasOwnProperty.call(payload, key));
  const rawProfile = hasOwn('profile')
    ? payload.profile
    : hasOwn('reader_profile')
      ? payload.reader_profile
      : payload ?? null;
  const profile = normalizeStudentProfile(rawProfile, options);
  const onboarding = deriveOnboardingState(rawProfile, payload?.onboarding ?? rawProfile?.onboarding);

  return {
    onboarding: profile?.onboarding ?? onboarding,
    profile,
  };
}

export async function getMyProfile(token?: string | null): Promise<ReaderProfileSnapshot> {
  return libraryRequest('/api/v1/readers/me/profile', {
    fallback: getMockSessionMe,
    method: 'GET',
    token,
  }).then((payload: any) =>
    normalizeReaderProfilePayload(payload, {
      accountId: payload?.account_id ?? payload?.account?.id ?? payload?.profile?.account_id ?? 1,
    })
  );
}

export async function updateMyProfile(
  token: string | null | undefined,
  payload: ProfileUpdateInput
): Promise<ReaderProfileSnapshot> {
  return libraryRequest('/api/v1/readers/me/profile', {
    body: JSON.stringify({
      college: payload.college,
      display_name: payload.displayName,
      grade_year: payload.gradeYear,
      interest_tags: payload.interestTags,
      major: payload.major,
      reading_profile_summary: payload.readingProfileSummary,
    }),
    method: 'PATCH',
    token,
    fallback: () =>
      updateMockProfile({
        college: payload.college ?? null,
        displayName: payload.displayName ?? undefined,
        gradeYear: payload.gradeYear ?? null,
        interestTags: payload.interestTags ?? undefined,
        major: payload.major ?? null,
        readingProfileSummary: payload.readingProfileSummary ?? null,
      }),
  }).then((response: any) =>
    normalizeReaderProfilePayload(response, {
      accountId:
        response?.account_id ??
        response?.account?.id ??
        response?.profile?.account_id ??
        response?.identity?.accountId ??
        1,
    })
  );
}
