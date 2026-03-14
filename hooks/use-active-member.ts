import { useUsersQuery, useCurrentUserQuery } from '@/lib/api/react-query/hooks';
import { useSessionStore } from '@/stores/session-store';

export function useActiveMember() {
  const currentMemberId = useSessionStore((state) => state.currentMemberId);
  const usersQuery = useUsersQuery();
  const currentUserQuery = useCurrentUserQuery();

  const members = usersQuery.data ?? [];
  const activeMember =
    members.find((member) => member.id === currentMemberId) ??
    currentUserQuery.data ??
    members[0] ??
    null;

  return {
    activeMember,
    currentMemberId,
    currentUserQuery,
    members,
    usersQuery,
  };
}
