import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { AvatarGlyph } from '@/components/member/avatar-glyph';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { MemberSummary } from '@/lib/api/contracts/types';
import {
  getMemberAccentColor,
  getMemberAvatarLabel,
  getMemberRoleLabel,
} from '@/lib/presentation/member-presentation';

type MemberSwitcherSheetContentProps = {
  activeMemberId?: number | null;
  members: MemberSummary[];
  onClose: () => void;
  onSelectMember: (memberId: number) => void;
  pendingMemberId: number | null;
};

export function MemberSwitcherSheetContent({
  activeMemberId,
  members,
  onClose,
  onSelectMember,
  pendingMemberId,
}: MemberSwitcherSheetContentProps) {
  const parentMembers = members.filter((member) => member.role === 'parent');
  const readerMembers = members.filter((member) => member.role !== 'parent');

  return (
    <View
      style={{
        backgroundColor: bookleafTheme.colors.surface,
        borderColor: bookleafTheme.colors.border,
        borderCurve: 'continuous',
        borderRadius: 28,
        borderWidth: 1,
        gap: 20,
        padding: 24,
      }}>
      <View style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.heading,
            fontSize: 30,
          }}>
          切换成员
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            ...bookleafTheme.typography.body,
            fontSize: 14,
          }}>
          不离开当前页面，直接切换这台书柜正在服务的家庭成员。
        </Text>
      </View>
      {parentMembers.length ? (
        <MemberSection
          activeMemberId={activeMemberId}
          label="家长"
          members={parentMembers}
          onSelectMember={onSelectMember}
          pendingMemberId={pendingMemberId}
        />
      ) : null}
      {readerMembers.length ? (
        <MemberSection
          activeMemberId={activeMemberId}
          label="读者"
          members={readerMembers}
          onSelectMember={onSelectMember}
          pendingMemberId={pendingMemberId}
        />
      ) : null}
      <PrimaryActionButton label="关闭" onPress={onClose} variant="ghost" />
    </View>
  );
}

type MemberSectionProps = {
  activeMemberId?: number | null;
  label: string;
  members: MemberSummary[];
  onSelectMember: (memberId: number) => void;
  pendingMemberId: number | null;
};

function MemberSection({
  activeMemberId,
  label,
  members,
  onSelectMember,
  pendingMemberId,
}: MemberSectionProps) {
  return (
    <View style={{ gap: 12 }}>
      <Text
        selectable
        style={{
          color: bookleafTheme.colors.textMuted,
          ...bookleafTheme.typography.bold,
          fontSize: 12,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}>
        {label}
      </Text>
      {members.map((member) => (
        <MemberSwitcherRow
          active={member.id === activeMemberId}
          busy={pendingMemberId === member.id}
          disabled={pendingMemberId != null}
          key={member.id}
          member={member}
          onPress={() => onSelectMember(member.id)}
        />
      ))}
    </View>
  );
}

type MemberSwitcherRowProps = {
  active: boolean;
  busy?: boolean;
  disabled?: boolean;
  member: MemberSummary;
  onPress: () => void;
};

function MemberSwitcherRow({
  active,
  busy = false,
  disabled = false,
  member,
  onPress,
}: MemberSwitcherRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: active ? 'rgba(127, 168, 255, 0.12)' : bookleafTheme.colors.surface,
        borderColor: active ? bookleafTheme.colors.primaryStrong : bookleafTheme.colors.border,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.lg,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 14,
        opacity: disabled && !busy ? 0.6 : 1,
        padding: 14,
      }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: getMemberAccentColor(member),
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.pill,
          height: 54,
          justifyContent: 'center',
          width: 54,
        }}>
        <AvatarGlyph size={24} value={getMemberAvatarLabel(member)} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.semiBold,
            fontSize: 16,
          }}>
          {member.name}
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            ...bookleafTheme.typography.body,
            fontSize: 13,
          }}>
          {getMemberRoleLabel(member)}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator color={bookleafTheme.colors.primaryStrong} />
      ) : active ? (
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.primaryStrong,
            ...bookleafTheme.typography.bold,
            fontSize: 13,
          }}>
          当前
        </Text>
      ) : null}
    </Pressable>
  );
}
