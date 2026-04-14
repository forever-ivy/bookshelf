import { Stack, useRouter } from 'expo-router';
import React from 'react';
import type { SearchBarCommands } from 'react-native-screens';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { TutorChatBubble } from '@/components/tutor/tutor-chat-bubble';
import { useTutorWorkspaceHeaderMenuOptions } from '@/components/tutor/tutor-workspace-header-menu-button';
import { TutorWorkspaceLoadingState } from '@/components/tutor/tutor-workspace-loading-state';
import {
  resolveTutorWorkspaceStatusDescription,
  useTutorWorkspaceScreen,
} from '@/components/tutor/tutor-workspace-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

function WorkspaceSignalCard({
  body,
  title,
  tone,
}: {
  body: string;
  title: string;
  tone: 'info' | 'success' | 'warning';
}) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'success'
      ? {
          backgroundColor: theme.colors.successSoft,
          color: theme.colors.success,
        }
      : tone === 'warning'
        ? {
            backgroundColor: theme.colors.warningSoft,
            color: theme.colors.warning,
          }
        : {
            backgroundColor: theme.colors.primarySoft,
            color: theme.colors.primaryStrong,
          };

  return (
    <View
      style={{
        backgroundColor: palette.backgroundColor,
        borderRadius: theme.radii.lg,
        gap: 4,
        padding: theme.spacing.lg,
      }}>
      <Text
        style={{
          color: palette.color,
          ...theme.typography.semiBold,
          fontSize: 14,
        }}>
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 13,
          lineHeight: 19,
        }}>
        {body}
      </Text>
    </View>
  );
}

export default function TutorWorkspaceGuideRoute() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';
  const router = useRouter();
  const searchBarRef = React.useRef<SearchBarCommands | null>(null);
  const {
    footerInset,
    handleSend,
    latestEvaluation,
    latestSessionSignal,
    latestStatus,
    profile,
    renderedMessages,
    setDraft,
    starterPrompts,
    workspaceSession,
  } = useTutorWorkspaceScreen();

  const searchPlaceholder = '继续你的学习';
  const menuButtonOptions = useTutorWorkspaceHeaderMenuOptions({
    label: '打开导学路径',
    onPress: () =>
      router.push({
        params: { panel: 'path', profileId: String(profile?.id ?? '') },
        pathname: '/tutor/[profileId]/info-sheet',
      }),
    testID: 'tutor-workspace-guide-menu-button',
  });

  const handlePromptPress = React.useCallback((prompt: string) => {
    setDraft(prompt);
    searchBarRef.current?.setText(prompt);
    searchBarRef.current?.focus();
  }, [setDraft]);

  const handleSearchSubmit = React.useCallback(async (text: string) => {
    const normalized = text.trim();
    if (!normalized) {
      return;
    }

    searchBarRef.current?.clearText();
    setDraft('');
    await handleSend(normalized);
  }, [handleSend, setDraft]);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <SecondaryBackButton
              label="退出导学本"
              testID="tutor-workspace-guide-exit-button"
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
          title: '导学',
          ...menuButtonOptions,
        }}
      />
      <Stack.SearchBar
        ref={searchBarRef}
        hideNavigationBar={false}
        obscureBackground={false}
        onCancelButtonPress={() => {
          setDraft('');
          searchBarRef.current?.clearText();
        }}
        onChangeText={(event) => {
          setDraft(event.nativeEvent.text);
        }}
        onSearchButtonPress={(event) => {
          void handleSearchSubmit(event.nativeEvent.text);
        }}
        placeholder={searchPlaceholder}
        placement="automatic"
      />

      {profile && workspaceSession ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ backgroundColor: theme.colors.surface, flex: 1 }}>
          <ScrollView
            bounces={false}
            contentContainerStyle={{
              flexGrow: 1,
              gap: theme.spacing.xl,
              paddingBottom: footerInset,
              paddingHorizontal: theme.spacing.xl,
              paddingTop: theme.spacing.lg,
            }}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {latestStatus ? (
              <WorkspaceSignalCard
                body={latestStatus.label}
                title="工作区状态"
                tone={latestStatus.tone}
              />
            ) : null}

            {latestEvaluation ? (
              <WorkspaceSignalCard
                body={`本轮置信度 ${(latestEvaluation.confidence * 100).toFixed(0)}%。${latestEvaluation.reasoning}`}
                title={latestEvaluation.meetsCriteria ? '步骤已推进' : '继续追问这一节'}
                tone={latestEvaluation.meetsCriteria ? 'success' : 'warning'}
              />
            ) : null}

            {latestSessionSignal?.transitionLabel ? (
              <WorkspaceSignalCard
                body={latestSessionSignal.transitionLabel}
                title="导学推进"
                tone={latestEvaluation?.meetsCriteria ? 'success' : 'info'}
              />
            ) : null}

            {starterPrompts.length > 0 ? (
              <View style={{ gap: theme.spacing.md }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                  }}>
                  可以从这些问题开始
                </Text>

                <View style={{ gap: theme.spacing.sm }}>
                  {starterPrompts.map((prompt) => (
                    <Pressable
                      key={prompt}
                      accessibilityRole="button"
                      onPress={() => handlePromptPress(prompt)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.88 : 1,
                      })}>
                      <View
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.borderSoft,
                          borderRadius: theme.radii.lg,
                          borderWidth: 1,
                          paddingHorizontal: theme.spacing.lg,
                          paddingVertical: 14,
                        }}>
                        <Text
                          style={{
                            color: theme.colors.text,
                            ...theme.typography.body,
                            fontSize: 15,
                            lineHeight: 22,
                          }}>
                          {prompt}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.xxl }}>
              {renderedMessages.map((message) => (
                <TutorChatBubble
                  key={message.id}
                  role={message.role as 'assistant' | 'user'}
                  streaming={message.streaming}
                  text={message.text}
                />
              ))}
            </View>
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
