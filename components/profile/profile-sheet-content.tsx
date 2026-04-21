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
  const contentSpacing = {
    gap: theme.spacing.xxl,
    paddingBottom: insets.bottom + theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  } as const;
  const content = (
    <>
      <View
        style={{
          alignItems: 'center',
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.xxxl + theme.spacing.md,
        }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 28,
            letterSpacing: -0.6,
            textAlign: 'center',
          }}>
          个人中心
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

  if (!usesExternalNativeScroll) {
    return (
      <ScrollView
        bounces={false}
        contentContainerStyle={contentSpacing}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        style={{
          backgroundColor: theme.colors.surface,
          flex: 1,
        }}
        testID="profile-sheet-surface"
        showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  }

  return (
    <View
      testID="profile-sheet-surface"
      style={{
        alignSelf: 'stretch',
        backgroundColor: theme.colors.surface,
        paddingBottom: insets.bottom,
      }}>
      <View
        testID="profile-sheet-content-stack"
        style={{
          gap: theme.spacing.xxl,
          paddingBottom: theme.spacing.lg,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: theme.spacing.lg,
        }}>
        {content}
      </View>
    </View>
  );
}
