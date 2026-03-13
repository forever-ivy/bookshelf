import type { MemberSummary, MemberStats } from '@/lib/api/contracts/types';

type ProfileMember = Pick<MemberSummary, 'avatar' | 'color' | 'id' | 'name' | 'role'>;
type ProfileMemberStats = Pick<MemberStats, 'avatar' | 'color' | 'id' | 'name' | 'role'>;

export function getProfileAvatarValue(member?: Pick<MemberSummary, 'avatar'> | null) {
  return member?.avatar?.trim() || '?';
}

export function resolveProfileMember(
  members: MemberSummary[],
  memberId: number,
  stats?: ProfileMemberStats | null
): ProfileMember | null {
  const member = members.find((item) => item.id === memberId);

  if (member) {
    return member;
  }

  if (stats?.id === memberId) {
    return {
      avatar: stats.avatar ?? null,
      color: stats.color ?? null,
      id: stats.id,
      name: stats.name ?? '读者',
      role: stats.role ?? 'reader',
    };
  }

  return null;
}
