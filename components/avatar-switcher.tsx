import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AvatarGlyph } from '@/components/avatar-glyph';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { MemberSummary } from '@/lib/api/types';
import {
  getMemberAccentColor,
  getMemberAvatarLabel,
  getMemberRoleLabel,
} from '@/lib/member-presentation';

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
              backgroundColor: getMemberAccentColor(member),
              borderColor: bookleafTheme.colors.surface,
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.pill,
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
            color: bookleafTheme.colors.text,
            fontFamily: bookleafTheme.fonts.semiBold,
            fontSize: 15,
          }}>
          {activeMember?.name ?? '选择成员'}
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            fontFamily: bookleafTheme.fonts.body,
            fontSize: 12,
          }}>
          切换{getMemberRoleLabel(activeMember)}
        </Text>
      </View>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.82)',
          borderColor: bookleafTheme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.pill,
          borderWidth: 1,
          height: 38,
          justifyContent: 'center',
          width: 38,
        }}>
        <AppIcon color={bookleafTheme.colors.textMuted} name="spark" size={16} />
      </View>
    </Pressable>
  );
}
