/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';

import type { MemberSummary } from '@/lib/api/contracts/types';

type MemberSwitcherSheetProps = {
  activeMemberId?: number | null;
  isOpen: boolean;
  members: MemberSummary[];
  onClose: () => void;
  onSelectMember: (memberId: number) => Promise<unknown> | unknown;
};

const MemberSwitcherSheetImplementation: React.ComponentType<MemberSwitcherSheetProps> =
  process.env.EXPO_OS === 'android'
    ? require('./member-switcher-sheet.android.tsx').MemberSwitcherSheet
    : process.env.EXPO_OS === 'web'
      ? require('./member-switcher-sheet.web.tsx').MemberSwitcherSheet
      : require('./member-switcher-sheet.ios.tsx').MemberSwitcherSheet;

export function MemberSwitcherSheet(props: MemberSwitcherSheetProps) {
  return <MemberSwitcherSheetImplementation {...props} />;
}
