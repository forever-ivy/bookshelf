import React from 'react';
import { Modal, Pressable, View } from 'react-native';

import { MemberSwitcherSheetContent } from '@/components/member/member-switcher-sheet-content';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
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
  const { theme } = useBookleafTheme();
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

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={isOpen}>
      <Pressable
        onPress={onClose}
        style={{
          backgroundColor: theme.colors.modalScrim,
          bottom: 0,
          justifyContent: 'flex-end',
          left: 0,
          padding: 16,
          position: 'absolute',
          right: 0,
          top: 0,
        }}>
        <Pressable onPress={() => null}>
          <View>
            <MemberSwitcherSheetContent
              activeMemberId={activeMemberId}
              members={members}
              onClose={onClose}
              onSelectMember={handleSelectMember}
              pendingMemberId={pendingMemberId}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
