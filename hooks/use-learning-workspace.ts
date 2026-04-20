import React from 'react';
import { toast } from 'sonner-native';

import {
  useGenerateLearningProfileMutation,
  useLearningProfileQuery,
  useLearningSessionsQuery,
  useStartLearningSessionMutation,
} from '@/hooks/use-library-app-data';
import { getLibraryErrorMessage } from '@/lib/api/client';
import type { LearningProfile, LearningSession } from '@/lib/api/types';
import { resolveLearningWorkspaceSourceSummary as resolveWorkspaceSourceSummary } from '@/lib/learning/workspace';

export type LearningWorkspaceGate =
  | {
      description: string;
      kind: 'failed';
      title: string;
    }
  | {
      description: string;
      kind: 'loading';
      title: string;
    }
  | {
      description: string;
      kind: 'processing';
      title: string;
    }
  | {
      description: string;
      kind: 'ready';
      title: string;
    };

function getLatestAttemptCount(profile?: LearningProfile | null) {
  return profile?.latestJob?.attemptCount ?? 0;
}

export function resolveLearningWorkspaceStatusDescription(
  status?: LearningProfile['status'],
  options: {
    attemptCount?: number | null;
    failureMessage?: string | null;
    latestJobStatus?: string | null;
  } = {}
) {
  const attemptCount = options.attemptCount ?? 0;
  const latestJobStatus = options.latestJobStatus ?? null;

  switch (status) {
    case 'ready':
      return '导学本已经准备好，正在为你开启工作区。';
    case 'failed':
      return options.failureMessage?.trim() || '这份资料暂时没能生成成功，你可以重新触发生成。';
    case 'processing':
      return '资料正在后台解析和整理，完成后会自动进入工作区。';
    case 'queued':
      return attemptCount > 0 || latestJobStatus === 'processing'
        ? '资料正在后台解析和整理，完成后会自动进入工作区。'
        : '导学任务已经创建，正在为这份资料启动解析与整理。';
    default:
      return '正在加载导学本资料与当前工作区。';
  }
}

function resolveLearningWorkspaceGate(
  profile: LearningProfile | null | undefined,
  options: {
    hasSession: boolean;
    isProfilePending: boolean;
    isStartingSession: boolean;
  }
): LearningWorkspaceGate {
  if (options.isProfilePending || !profile) {
    return {
      description: '正在加载导学本资料与当前工作区。',
      kind: 'loading',
      title: '正在准备导学本',
    };
  }

  if (profile.status === 'failed') {
    return {
      description: resolveLearningWorkspaceStatusDescription(profile.status, {
        failureMessage: profile.failureMessage,
      }),
      kind: 'failed',
      title: '生成失败',
    };
  }

  if (profile.status === 'queued' || profile.status === 'processing') {
    const attemptCount = getLatestAttemptCount(profile);
    const latestJobStatus = profile.latestJob?.status ?? null;

    return {
      description: resolveLearningWorkspaceStatusDescription(profile.status, {
        attemptCount,
        latestJobStatus,
      }),
      kind: 'processing',
      title: '后台处理中',
    };
  }

  if (profile.status === 'ready' && options.hasSession) {
    return {
      description: '导学工作区已经打开，可以继续推进当前学习步骤。',
      kind: 'ready',
      title: '导学本已准备好',
    };
  }

  return {
    description: options.isStartingSession
      ? '导学本已经准备好，正在为你开启工作区。'
      : '正在连接当前导学工作区。',
    kind: 'loading',
    title: '正在进入工作区',
  };
}

export function resolveLearningWorkspaceSourceSummary(profile: LearningProfile) {
  return resolveWorkspaceSourceSummary(profile);
}

function pickLatestActiveSession(sessions: LearningSession[]) {
  return [...sessions].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  )[0] ?? null;
}

export function useLearningWorkspace(
  profileId: number,
  studyMode: 'guide' | 'explore' = 'explore'
) {
  const profileQuery = useLearningProfileQuery(profileId);
  const sessionsQuery = useLearningSessionsQuery();
  const startSessionMutation = useStartLearningSessionMutation();
  const generateProfileMutation = useGenerateLearningProfileMutation();
  const autoTriggeredGenerationProfileRef = React.useRef<number | null>(null);
  const profile = profileQuery.data;
  const startingSessionRef = React.useRef(false);
  const targetSessionKind = studyMode === 'guide' ? 'guide' : 'explore';
  const activeSessions = React.useMemo(
    () =>
      (sessionsQuery.data ?? []).filter(
        (item) => item.learningProfileId === profileId && item.status !== 'completed'
      ),
    [profileId, sessionsQuery.data]
  );
  const activeGuideSessions = React.useMemo(
    () => activeSessions.filter((item) => item.sessionKind === 'guide'),
    [activeSessions]
  );
  const standaloneExploreSessions = React.useMemo(
    () =>
      activeSessions.filter(
        (item) => item.sessionKind === 'explore' && !item.sourceSessionId
      ),
    [activeSessions]
  );
  const defaultSession = React.useMemo(
    () =>
      targetSessionKind === 'guide'
        ? pickLatestActiveSession(activeGuideSessions)
        : pickLatestActiveSession(standaloneExploreSessions),
    [activeGuideSessions, standaloneExploreSessions, targetSessionKind]
  );
  const [workspaceSession, setWorkspaceSession] = React.useState<LearningSession | null>(
    defaultSession ?? null
  );

  React.useEffect(() => {
    const matchedCurrent =
      workspaceSession != null
        ? activeSessions.find((item) => item.id === workspaceSession.id) ?? null
        : null;

    if (matchedCurrent && matchedCurrent.sessionKind === targetSessionKind) {
      setWorkspaceSession((current) => {
        if (
          current &&
          current.id === matchedCurrent.id &&
          current.updatedAt === matchedCurrent.updatedAt
        ) {
          return current;
        }

        return matchedCurrent;
      });
      return;
    }

    if (
      workspaceSession &&
      workspaceSession.learningProfileId === profileId &&
      workspaceSession.sessionKind === targetSessionKind &&
      workspaceSession.status !== 'completed'
    ) {
      return;
    }

    if (defaultSession) {
      setWorkspaceSession((current) => {
        if (
          current &&
          current.id === defaultSession.id &&
          current.updatedAt === defaultSession.updatedAt
        ) {
          return current;
        }

        return defaultSession;
      });
      return;
    }

    if (profile?.status !== 'ready') {
      setWorkspaceSession(null);
      return;
    }

    if (workspaceSession !== null) {
      setWorkspaceSession(null);
    }
  }, [activeGuideSessions, activeSessions, defaultSession, profile?.status, profileId, targetSessionKind, workspaceSession]);

  React.useEffect(() => {
    if (
      !profile ||
      profile.status !== 'ready' ||
      workspaceSession ||
      startSessionMutation.isPending ||
      startingSessionRef.current
    ) {
      return;
    }

    let isActive = true;
    startingSessionRef.current = true;

    startSessionMutation
      .mutateAsync({ profileId: profile.id, sessionKind: targetSessionKind })
      .then((result) => {
        if (isActive) {
          setWorkspaceSession(result.session);
        }
      })
      .catch((error) => {
        if (isActive) {
          toast.error(getLibraryErrorMessage(error, '启动导学工作区失败，请稍后再试。'));
        }
      })
      .finally(() => {
        if (isActive) {
          startingSessionRef.current = false;
        }
      });

    return () => {
      isActive = false;
    };
  }, [profile, startSessionMutation, targetSessionKind, workspaceSession]);

  React.useEffect(() => {
    if (!profile || generateProfileMutation.isPending) {
      return;
    }

    const latestJobStatus = profile.latestJob?.status ?? null;
    const attemptCount = getLatestAttemptCount(profile);
    const shouldAutoTrigger =
      (profile.status === 'queued' || profile.status === 'processing') &&
      latestJobStatus !== 'processing' &&
      attemptCount === 0;

    if (!shouldAutoTrigger || autoTriggeredGenerationProfileRef.current === profile.id) {
      return;
    }

    autoTriggeredGenerationProfileRef.current = profile.id;
    retryGenerate(profile.id).catch(() => {
      autoTriggeredGenerationProfileRef.current = null;
    });
  }, [generateProfileMutation.isPending, profile, retryGenerate]);

  const retryGenerate = React.useCallback(
    async (nextProfileId = profileId) => {
      try {
        setWorkspaceSession(null);
        await generateProfileMutation.mutateAsync(nextProfileId);
        await Promise.allSettled([profileQuery.refetch(), sessionsQuery.refetch()]);
      } catch (error) {
        toast.error(getLibraryErrorMessage(error, '重新触发导学生成失败，请稍后再试。'));
        throw error;
      }
    },
    [generateProfileMutation, profileId, profileQuery, sessionsQuery]
  );

  const workspaceGate = React.useMemo(
    () =>
      resolveLearningWorkspaceGate(profile, {
        hasSession: Boolean(workspaceSession),
        isProfilePending: Boolean(profileQuery.isPending && !profile),
        isStartingSession: startSessionMutation.isPending,
      }),
    [profile, profileQuery.isPending, startSessionMutation.isPending, workspaceSession]
  );

  return {
    isRetryPending: generateProfileMutation.isPending,
    profile,
    profileQuery,
    retryGenerate,
    setWorkspaceSession,
    sessionsQuery,
    workspaceGate,
    workspaceSession,
  };
}
