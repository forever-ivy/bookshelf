import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AvatarGlyph } from '@/components/member/avatar-glyph';
import { GlassSurface } from '@/components/surfaces/glass-surface';
import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { MemberSummary } from '@/lib/api/contracts/types';
import {
  getMemberAccentColor,
  getMemberAvatarLabel,
  getMemberRoleLabel,
} from '@/lib/presentation/member-presentation';
import { motionTokens, motionTransitions } from '@/lib/presentation/motion';

type MemberSwitcherSheetProps = {
  activeMemberId?: number | null;
  isOpen: boolean;
  members: MemberSummary[];
  onClose: () => void;
  onSelectMember: (memberId: number) => Promise<unknown> | unknown;
};

function renderMemberSectionTitle(label: string) {
  return (
    <Text
      selectable
      style={{
        color: bookleafTheme.colors.textMuted,
        fontFamily: bookleafTheme.fonts.bold,
        fontSize: 12,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
      }}>
      {label}
    </Text>
  );
}

export function MemberSwitcherSheet({
  activeMemberId,
  isOpen,
  members,
  onClose,
  onSelectMember,
}: MemberSwitcherSheetProps) {
  const bottomSheetRef = React.useRef<BottomSheetModal>(null);
  const [pendingMemberId, setPendingMemberId] = React.useState<number | null>(null);
  const parentMembers = members.filter((member) => member.role === 'parent');
  const readerMembers = members.filter((member) => member.role !== 'parent');
  const snapPoints = React.useMemo(() => ['58%', '80%'], []);
  const contentProgress = useSharedValue(0);

  React.useEffect(() => {
    if (isOpen) {
      if (process.env.EXPO_OS === 'ios') {
        Haptics.selectionAsync().catch(() => null);
      }

      contentProgress.value = withSpring(1, motionTokens.spring.gentle);
      bottomSheetRef.current?.present();
      return;
    }

    contentProgress.value = 0;
    bottomSheetRef.current?.dismiss();
  }, [contentProgress, isOpen]);

  const handleDismiss = React.useCallback(() => {
    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    }

    onClose();
  }, [onClose]);

  const renderBackdrop = React.useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.22}
        pressBehavior="close"
      />
    ),
    []
  );

  const contentMotionStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(contentProgress.value, [0, 1], [20, 0]),
      },
      {
        scale: interpolate(contentProgress.value, [0, 1], [0.98, 1]),
      },
    ],
  }));

  async function handleSelectMember(memberId: number) {
    if (pendingMemberId != null) {
      return;
    }

    setPendingMemberId(memberId);

    if (process.env.EXPO_OS === 'ios') {
      Haptics.selectionAsync().catch(() => null);
    }

    try {
      await onSelectMember(memberId);

      if (process.env.EXPO_OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => null
        );
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 140);
      });
      bottomSheetRef.current?.dismiss();
    } finally {
      setPendingMemberId(null);
    }
  }

  return (
    <BottomSheetModal
      animateOnMount
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: 'transparent' }}
      enableDynamicSizing={false}
      enablePanDownToClose
      handleComponent={() => null}
      onDismiss={handleDismiss}
      ref={bottomSheetRef}
      snapPoints={snapPoints}>
      <BottomSheetView
        style={{
          backgroundColor: 'transparent',
          paddingBottom: 18,
          paddingHorizontal: 16,
        }}>
        <Animated.View style={contentMotionStyle}>
          <GlassSurface
            containerSpacing={14}
            fallbackMode="material"
            motionPreset="sheet"
            style={{
              borderCurve: 'continuous',
              borderRadius: 34,
              gap: 20,
              padding: 24,
            }}>
            <View style={{ gap: 8 }}>
              <View
                style={{
                  alignSelf: 'center',
                  backgroundColor: 'rgba(255,255,255,0.6)',
                  borderCurve: 'continuous',
                  borderRadius: bookleafTheme.radii.pill,
                  height: 5,
                  width: 54,
                }}
              />
              <Text
                selectable
                style={{
                  color: bookleafTheme.colors.text,
                  fontFamily: bookleafTheme.fonts.heading,
                  fontSize: 30,
                }}>
                切换成员
              </Text>
              <Text
                selectable
                style={{
                  color: bookleafTheme.colors.textMuted,
                  fontFamily: bookleafTheme.fonts.body,
                  fontSize: 14,
                }}>
                不离开当前页面，直接切换这台书柜正在服务的家庭成员。
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {parentMembers.length ? renderMemberSectionTitle('家长') : null}
              {parentMembers.map((member) => (
                <MemberSwitcherRow
                  active={member.id === activeMemberId}
                  busy={pendingMemberId === member.id}
                  disabled={pendingMemberId != null}
                  key={member.id}
                  member={member}
                  onPress={() => handleSelectMember(member.id)}
                />
              ))}
            </View>
            <View style={{ gap: 12 }}>
              {readerMembers.length ? renderMemberSectionTitle('读者') : null}
              {readerMembers.map((member) => (
                <MemberSwitcherRow
                  active={member.id === activeMemberId}
                  busy={pendingMemberId === member.id}
                  disabled={pendingMemberId != null}
                  key={member.id}
                  member={member}
                  onPress={() => handleSelectMember(member.id)}
                />
              ))}
            </View>
            <PrimaryActionButton label="关闭" onPress={() => bottomSheetRef.current?.dismiss()} variant="ghost" />
          </GlassSurface>
        </Animated.View>
      </BottomSheetView>
    </BottomSheetModal>
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
  const activeProgress = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    activeProgress.value = withSpring(active ? 1 : 0, motionTokens.spring.snappy);
  }, [active, activeProgress]);

  const avatarStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(activeProgress.value, [0, 1], [0.96, 1]),
      },
    ],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    width: interpolate(activeProgress.value, [0, 1], [28, 58]),
  }));

  return (
    <Animated.View layout={motionTransitions.snappy}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={{
          alignItems: 'center',
          backgroundColor: active ? 'rgba(158,195,255,0.24)' : 'rgba(255,255,255,0.38)',
          borderColor: active ? 'rgba(127,168,255,0.32)' : 'rgba(255,255,255,0.28)',
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.lg,
          borderWidth: 1,
          flexDirection: 'row',
          gap: 14,
          opacity: disabled && !busy ? 0.6 : 1,
          padding: 14,
        }}>
        <Animated.View
          style={[
            {
              alignItems: 'center',
              backgroundColor: getMemberAccentColor(member),
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.pill,
              height: 54,
              justifyContent: 'center',
              width: 54,
            },
            avatarStyle,
          ]}>
          <AvatarGlyph size={24} value={getMemberAvatarLabel(member)} />
        </Animated.View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.text,
              fontFamily: bookleafTheme.fonts.semiBold,
              fontSize: 16,
            }}>
            {member.name}
          </Text>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.textMuted,
              fontFamily: bookleafTheme.fonts.body,
              fontSize: 13,
            }}>
            {busy ? '切换中...' : getMemberRoleLabel(member)}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator color={bookleafTheme.colors.primaryStrong} />
        ) : (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.66)',
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.pill,
              height: 6,
              overflow: 'hidden',
              width: 58,
            }}>
            <Animated.View
              style={[
                {
                  backgroundColor: active
                    ? bookleafTheme.colors.primaryStrong
                    : 'rgba(255,255,255,0.18)',
                  height: 6,
                },
                indicatorStyle,
              ]}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}
