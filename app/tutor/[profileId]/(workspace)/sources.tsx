import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useTutorWorkspaceHeaderMenuOptions } from '@/components/tutor/tutor-workspace-header-menu-button';
import { TutorWorkspaceLoadingState } from '@/components/tutor/tutor-workspace-loading-state';
import { TutorWorkspaceSourcesTab } from '@/components/tutor/tutor-workspace-sources-tab';
import {
  resolveTutorWorkspaceStatusDescription,
  useTutorWorkspaceScreen,
} from '@/components/tutor/tutor-workspace-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TutorWorkspaceSourcesRoute() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';
  const router = useRouter();
  const {
    footerInset,
    profile,
    sourceCards,
    workspaceSession,
  } = useTutorWorkspaceScreen();
  const menuButtonOptions = useTutorWorkspaceHeaderMenuOptions({
    label: '打开来源信息',
    onPress: () =>
      router.push({
        params: { panel: 'sources', profileId: String(profile?.id ?? '') },
        pathname: '/tutor/[profileId]/info-sheet',
      }),
    testID: 'tutor-workspace-sources-menu-button',
  });

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <SecondaryBackButton
              label="退出导学本"
              testID="tutor-workspace-sources-exit-button"
              variant="inline"
            />
          ),
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: isIos ? 'transparent' : theme.colors.surface,
          },
          headerTitle: '',
          headerTitleStyle: isIos
            ? {
                color: 'transparent',
              }
            : undefined,
          headerTintColor: theme.colors.text,
          headerTransparent: isIos,
          title: '来源',
          ...menuButtonOptions,
        }}
      />

      {profile && workspaceSession ? (
        <KeyboardAvoidingView style={{ backgroundColor: theme.colors.surface, flex: 1 }}>
          <ScrollView
            bounces={false}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: footerInset,
              paddingHorizontal: theme.spacing.xl,
              paddingTop: theme.spacing.lg,
            }}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}>
            <TutorWorkspaceSourcesTab
              heading="来源"
              sourceCards={sourceCards}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <TutorWorkspaceLoadingState
          description={resolveTutorWorkspaceStatusDescription(profile?.status)}
          title={profile?.title ?? '正在准备导学本'}
        />
      )}
    </>
  );
}
