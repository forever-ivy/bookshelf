import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/base/app-icon';
import { MeScreenContent } from '@/components/me/me-screen-content';
import { useAppTheme } from '@/hooks/use-app-theme';

export function ProfileSheetContent({
  onDismiss,
  scrollMode = 'react-native',
}: {
  onDismiss: () => void;
  scrollMode?: 'external-native' | 'react-native';
}) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const usesExternalNativeScroll = scrollMode === 'external-native';
  const content = (
    <>
      <View
        style={{
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.xxxl + theme.spacing.md,
        }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 32,
            letterSpacing: -0.9,
            textAlign: 'center',
          }}>
          个人中心
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 22,
            textAlign: 'center',
          }}>
          管理你的借阅资料、收藏、书单和提醒。
        </Text>
      </View>

      <MeScreenContent
        onProfilePress={() => {
          onDismiss();
          router.push('/profile');
        }}
      />
    </>
  );

  return (
    <View
      testID="profile-sheet-surface"
      style={{
        alignSelf: 'stretch',
        backgroundColor: theme.colors.backgroundStrong,
        flex: usesExternalNativeScroll ? undefined : 1,
        paddingBottom: insets.bottom,
      }}>
      <Pressable
        accessibilityLabel="关闭个人中心"
        accessibilityRole="button"
        onPress={onDismiss}
        style={({ pressed }) => ({
          opacity: pressed ? 0.88 : 1,
          position: 'absolute',
          right: theme.spacing.xl,
          top: theme.spacing.xl,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          zIndex: 2,
        })}
        testID="profile-sheet-close-button">
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            height: 54,
            justifyContent: 'center',
            width: 54,
          }}>
          <AppIcon color={theme.colors.text} name="x" size={24} strokeWidth={2.2} />
        </View>
      </Pressable>
      {usesExternalNativeScroll ? (
        <View
          style={{
            gap: theme.spacing.xxl,
            paddingBottom: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.xxxl + theme.spacing.xl,
          }}>
          {content}
        </View>
      ) : (
        <ScrollView
          bounces={false}
          contentContainerStyle={{
            gap: theme.spacing.xxl,
            paddingBottom: theme.spacing.lg,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.xxxl + theme.spacing.xl,
          }}
          testID="profile-sheet-scroll-content"
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      )}
    </View>
  );
}
