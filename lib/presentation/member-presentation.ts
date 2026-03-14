import type { MemberSummary } from '@/lib/api/contracts/types';

export function getMemberAccentColor(
  member?: Pick<MemberSummary, 'color'> | null,
  isDark = false
) {
  switch (member?.color) {
    case 'cool':
      return isDark ? '#5C74C7' : '#C9D7FF';
    case 'forest':
      return isDark ? '#4F8B6B' : '#CDECCF';
    case 'sun':
      return isDark ? '#B28A4E' : '#F7D8A8';
    case 'rose':
      return isDark ? '#B36B87' : '#F8D0DA';
    default:
      return isDark ? '#6E9BFF' : '#9EC3FF';
  }
}

export function getMemberAvatarLabel(member?: Pick<MemberSummary, 'avatar' | 'name'> | null) {
  if (member?.avatar?.trim()) {
    return member.avatar.trim();
  }

  return member?.name?.trim().slice(0, 1).toUpperCase() || '?';
}

export function getMemberRoleLabel(member?: Pick<MemberSummary, 'role'> | null) {
  if (member?.role === 'parent') {
    return '家长';
  }

  return '读者';
}
