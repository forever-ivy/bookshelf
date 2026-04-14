import React from 'react';
import { toast } from 'sonner-native';

import {
  useStartTutorSessionMutation,
  useTutorProfileQuery,
  useTutorSessionsQuery,
} from '@/hooks/use-library-app-data';
import { getLibraryErrorMessage } from '@/lib/api/client';
import type { TutorProfile, TutorSession } from '@/lib/api/types';
import { resolveTutorWorkspaceSourceSummary as resolveWorkspaceSourceSummary } from '@/lib/tutor/workspace';

export function resolveTutorWorkspaceStatusDescription(status?: TutorProfile['status']) {
  switch (status) {
    case 'ready':
      return '导学本已经准备好，正在为你开启工作区。';
    case 'failed':
      return '这份资料暂时没能生成成功，你可以换一份资料重新开始。';
    case 'processing':
      return '正在解析并整理资料，请稍后。';
    case 'queued':
      return '导学任务已经入队，马上开始处理。';
    default:
      return '正在加载导学本资料与当前工作区。';
  }
}

export function resolveTutorWorkspaceSourceSummary(profile: TutorProfile) {
  return resolveWorkspaceSourceSummary(profile);
}

export function useTutorWorkspace(profileId: number) {
  const profileQuery = useTutorProfileQuery(profileId);
  const sessionsQuery = useTutorSessionsQuery();
  const startSessionMutation = useStartTutorSessionMutation();
  const profile = profileQuery.data;
  const activeSession = React.useMemo(
    () =>
      (sessionsQuery.data ?? []).find(
        (item) => item.tutorProfileId === profileId && item.status !== 'completed'
      ) ?? null,
    [profileId, sessionsQuery.data]
  );
  const [workspaceSession, setWorkspaceSession] = React.useState<TutorSession | null>(
    activeSession ?? null
  );

  React.useEffect(() => {
    if (activeSession) {
      setWorkspaceSession((current) => {
        if (
          current &&
          current.id === activeSession.id &&
          current.updatedAt === activeSession.updatedAt
        ) {
          return current;
        }

        return activeSession;
      });
    }
  }, [activeSession]);

  React.useEffect(() => {
    if (!profile || profile.status !== 'ready' || workspaceSession || startSessionMutation.isPending) {
      return;
    }

    startSessionMutation
      .mutateAsync(profile.id)
      .then((result) => {
        setWorkspaceSession(result.session);
      })
      .catch((error) => {
        toast.error(getLibraryErrorMessage(error, '启动导学工作区失败，请稍后再试。'));
      });
  }, [profile, workspaceSession, startSessionMutation]);

  return {
    profile,
    profileQuery,
    setWorkspaceSession,
    sessionsQuery,
    workspaceSession,
  };
}
