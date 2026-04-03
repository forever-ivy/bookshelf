import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
            color: theme.colors.primaryStrong,
            ...theme.typography.medium,
            fontSize: 11,
            letterSpacing: 0.8,
            textAlign: 'center',
          }}>
          PROFILE
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 32,
            letterSpacing: -0.9,
            textAlign: 'center',
          }}>
          账户
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 22,
            textAlign: 'center',
          }}>
          查看资料、借阅记录与常用入口。
        </Text>
      </View>

      <MeScreenContent
        onLogout={onDismiss}
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
