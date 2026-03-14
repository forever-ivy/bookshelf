import { BottomSheet, Host, RNHostView } from '@expo/ui/swift-ui';
import React from 'react';

import { MemberSwitcherSheetContent } from '@/components/member/member-switcher-sheet-content';
import type { MemberSummary } from '@/lib/api/contracts/types';

type MemberSwitcherSheetProps = {
  activeMemberId?: number | null;
  isOpen: boolean;
  members: MemberSummary[];
  onClose: () => void;
  onSelectMember: (memberId: number) => Promise<unknown> | unknown;
};

export function MemberSwitcherSheet({
  activeMemberId,
  isOpen,
  members,
  onClose,
  onSelectMember,
}: MemberSwitcherSheetProps) {
  const [pendingMemberId, setPendingMemberId] = React.useState<number | null>(null);

  async function handleSelectMember(memberId: number) {
    if (pendingMemberId != null) {
      return;
    }

    setPendingMemberId(memberId);

    try {
      await onSelectMember(memberId);
      onClose();
    } finally {
      setPendingMemberId(null);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <Host>
      <BottomSheet
        fitToContents
        isPresented={isOpen}
        onIsPresentedChange={(nextOpen) => {
          if (!nextOpen) {
            onClose();
          }
        }}>
        <RNHostView matchContents>
          <MemberSwitcherSheetContent
            activeMemberId={activeMemberId}
            members={members}
            onClose={onClose}
            onSelectMember={handleSelectMember}
            pendingMemberId={pendingMemberId}
          />
        </RNHostView>
      </BottomSheet>
    </Host>
  );
}
