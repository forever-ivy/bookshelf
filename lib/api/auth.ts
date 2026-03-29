import type { SessionPayload } from '@/lib/api/types';
import {
  createMockSessionPayload,
  getMockSessionMe,
  mockLoginSession,
  mockRegisterSession,
} from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';
import { normalizeReaderProfilePayload } from '@/lib/api/readers';

export type LoginInput = {
  password: string;
  username: string;
};

export type RegisterInput = {
  college?: string | null;
  displayName: string;
  gradeYear?: string | null;
  interestTags?: string[];
  major?: string | null;
  password: string;
  readingProfileSummary?: string | null;
  username: string;
};

function normalizeSessionPayload(
  payload: any,
  options: {
    fallbackAccessToken?: string | null;
    username?: string;
  } = {}
): SessionPayload {
  const accountId = payload?.account?.id ?? payload?.account_id ?? payload?.identity?.accountId ?? 1;
  const readerProfile = normalizeReaderProfilePayload(payload, { accountId });
  const identityProfileId =
    payload?.identity?.profileId ?? payload?.profile_id ?? payload?.profile?.id ?? readerProfile.profile?.id ?? null;

  return {
    accessToken:
      payload?.access_token ??
      payload?.accessToken ??
      options.fallbackAccessToken ??
      createMockSessionPayload().accessToken,
    account: {
      id: accountId,
      role: payload?.account?.role ?? payload?.role ?? 'reader',
      username: payload?.account?.username ?? options.username ?? 'reader',
    },
    identity: {
      accountId,
      profileId: identityProfileId,
      role: payload?.identity?.role ?? payload?.role ?? payload?.account?.role ?? 'reader',
    },
    onboarding: readerProfile.onboarding,
    profile: readerProfile.profile,
    refreshToken: payload?.refresh_token ?? payload?.refreshToken ?? null,
  };
}

export async function login(input: LoginInput): Promise<SessionPayload> {
  return libraryRequest('/api/v1/auth/login', {
    body: JSON.stringify({
      password: input.password,
      role: 'reader',
      username: input.username,
    }),
    fallback: async () => mockLoginSession(input.username),
    method: 'POST',
  }).then((payload: any) =>
    normalizeSessionPayload(payload, {
      fallbackAccessToken: createMockSessionPayload().accessToken,
      username: input.username,
    })
  );
}

export async function registerReader(input: RegisterInput): Promise<SessionPayload> {
  return libraryRequest('/api/v1/auth/register/reader', {
    body: JSON.stringify({
      college: input.college ?? undefined,
      display_name: input.displayName,
      grade_year: input.gradeYear ?? undefined,
      interest_tags: input.interestTags ?? [],
      major: input.major ?? undefined,
      password: input.password,
      reading_profile_summary: input.readingProfileSummary ?? undefined,
      username: input.username,
    }),
    fallback: async () => mockRegisterSession(input.username, input.displayName),
    method: 'POST',
  }).then((payload: any) =>
    normalizeSessionPayload(payload, {
      fallbackAccessToken: createMockSessionPayload().accessToken,
      username: input.username,
    })
  );
}

export async function getMe(token?: string | null): Promise<SessionPayload> {
  return libraryRequest('/api/v1/auth/me', {
    token,
    fallback: getMockSessionMe,
  }).then((payload: any) =>
    normalizeSessionPayload(payload, {
      fallbackAccessToken: token ?? createMockSessionPayload().accessToken,
    })
  );
}
