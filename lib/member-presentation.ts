import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { MemberSummary } from '@/lib/api/types';

export function getMemberAccentColor(member?: Pick<MemberSummary, 'color'> | null) {
  switch (member?.color) {
    case 'cool':
      return '#C9D7FF';
    case 'forest':
      return '#CDECCF';
    case 'sun':
      return '#F7D8A8';
    case 'rose':
      return '#F8D0DA';
    default:
      return bookleafTheme.colors.primary;
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
