import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { AvatarGlyph } from '@/components/member/avatar-glyph';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import type { MemberSummary } from '@/lib/api/contracts/types';
import {
  getMemberAccentColor,
  getMemberAvatarLabel,
  getMemberRoleLabel,
} from '@/lib/presentation/member-presentation';

type AvatarSwitcherProps = {
  activeMember?: MemberSummary | null;
  members: MemberSummary[];
  onPress: () => void;
};

export function AvatarSwitcher({
  activeMember,
  members,
  onPress,
}: AvatarSwitcherProps) {
  const { isDark, theme } = useBookleafTheme();
  const previewMembers = members.slice(0, 3);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 14,
      }}>
      <View style={{ flexDirection: 'row', paddingLeft: 20 }}>
        {previewMembers.map((member, index) => (
          <View
            key={member.id}
            style={{
              alignItems: 'center',
              backgroundColor: getMemberAccentColor(member, isDark),
              borderColor: theme.colors.surface,
              borderCurve: 'continuous',
              borderRadius: theme.radii.pill,
              borderWidth: 2,
              height: 48,
              justifyContent: 'center',
              marginLeft: index === 0 ? 0 : -20,
              width: 48,
              zIndex: previewMembers.length - index,
            }}>
            <AvatarGlyph size={20} value={getMemberAvatarLabel(member)} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 15,
          }}>
          {activeMember?.name ?? '选择成员'}
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 12,
          }}>
          切换{getMemberRoleLabel(activeMember)}
        </Text>
      </View>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: theme.radii.pill,
          borderWidth: 1,
          height: 38,
          justifyContent: 'center',
          width: 38,
        }}>
        <AppIcon color={theme.colors.textMuted} name="spark" size={16} />
      </View>
    </Pressable>
  );
}
