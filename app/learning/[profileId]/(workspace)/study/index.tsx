import { Stack } from 'expo-router';
import { Target } from 'lucide-react-native';
import React from 'react';
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SearchBarCommands } from 'react-native-screens';
import { toast } from 'sonner-native';

import { PillButton } from '@/components/base/pill-button';
import { GlassSurface } from '@/components/base/glass-surface';
import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';
import { LearningConversationScroll } from '@/components/learning/learning-conversation-scroll';
import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';
import {
  LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE,
  LEARNING_WORKSPACE_TOP_CHROME_OFFSET,
} from '@/components/learning/learning-workspace-scaffold';
import {
  useLearningWorkspaceScreen,
} from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { submitLearningBridgeAction } from '@/lib/api/learning';
import type { LearningBridgeAction } from '@/lib/api/types';

function supportsBottomToolbarSearch() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const majorVersion =
    typeof Platform.Version === 'string'
      ? Number.parseInt(Platform.Version, 10)
      : Platform.Version;

  return Number.isFinite(majorVersion) && Number(majorVersion) >= 26;
}

function resolveSearchBarText(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (
    value &&
    typeof value === 'object' &&
    'nativeEvent' in value &&
    value.nativeEvent &&
    typeof value.nativeEvent === 'object' &&
    'text' in value.nativeEvent &&
    typeof value.nativeEvent.text === 'string'
  ) {
    return value.nativeEvent.text;
  }

  return '';
}

function WorkspaceSummaryCard({
  body,
  chipLabel,
  criteriaBody,
  criteriaTitle,
  icon,
  onOpenOverview,
  status,
  title,
}: {
  body: string;
  chipLabel: string;
  criteriaBody: string;
  criteriaTitle: string;
  icon: React.ReactNode;
  onOpenOverview: () => void;
  status?: string | null;
  title: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
      }}>
      <View style={styles.heroHeader}>
        <View
          style={[
            styles.heroChip,
            {
              backgroundColor: theme.colors.primarySoft,
            },
          ]}>
          {icon}
          <Text
            selectable
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.semiBold,
              fontSize: 12,
            }}>
            {chipLabel}
          </Text>
        </View>
        {status ? (
          <Text
            selectable
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              flex: 1,
              fontSize: 12,
              textAlign: 'right',
            }}>
            {status}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 26,
            letterSpacing: -0.8,
            lineHeight: 32,
          }}>
          {title}
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          {body}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surfaceTint,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.xs,
          padding: theme.spacing.lg,
        }}>
        <Text
          selectable
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.semiBold,
            fontSize: 12,
          }}>
          {criteriaTitle}
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.medium,
            fontSize: 14,
            lineHeight: 21,
          }}>
          {criteriaBody}
        </Text>
      </View>

      <View style={{ paddingTop: theme.spacing.xs }}>
        <PillButton label="查看导学概览" onPress={onOpenOverview} variant="glass" />
      </View>
    </View>
  );
}

function ConversationSection({
  emptyLabel,
  messages,
  onAction,
}: {
  emptyLabel: string;
  messages: ReturnType<typeof useLearningWorkspaceScreen>['renderedMessages'];
  onAction?: (action: LearningBridgeAction) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: 14 }}>
        {messages.length > 0 ? (
          messages.map((message) => (
            <LearningConversationMessage
              key={message.id}
              message={message}
              onAction={onAction}
            />
          ))
        ) : (
          <GlassSurface
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 24,
              padding: 16,
            }}>
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              {emptyLabel}
            </Text>
          </GlassSurface>
        )}
      </View>
    </View>
  );
}

function ExplorePane({
  bottomPadding,
  messages,
  onOpenOverview,
  topPadding,
}: {
  bottomPadding?: number;
  messages: ReturnType<typeof useLearningWorkspaceScreen>['renderedMessages'];
  onOpenOverview: () => void;
  topPadding?: number;
}) {
  const { theme } = useAppTheme();
  const { profile, sourceSummary, workspaceSession } = useLearningWorkspaceScreen();
  const focusTitle =
    workspaceSession?.focusContext && typeof workspaceSession.focusContext.stepTitle === 'string'
      ? String(workspaceSession.focusContext.stepTitle)
      : workspaceSession?.currentStepTitle ?? '当前主题';

  return (
    <LearningConversationScroll
      contentContainerStyle={[
        styles.paneScrollContent,
        topPadding ? { paddingTop: topPadding } : null,
        bottomPadding ? { paddingBottom: bottomPadding } : null,
      ]}
      contentInsetAdjustmentBehavior="never"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      testID="learning-workspace-screen">
      <ConversationSection
        emptyLabel="问一个更细、更偏应用或更偏例子的延展问题，系统会基于当前资料给出答案。"
        messages={messages}
      />
    </LearningConversationScroll>
  );
}

export default function LearningWorkspaceStudyRoute() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAppSession();
  const {
    closeWorkspace,
    draft,
    handleSend,
    isRetryPending,
    navigateToStudyMode,
    openOverview,
    profile,
    renderedMessages,
    replaceWorkspaceSession,
    retryGenerate,
    setDraft,
    studyMode,
    workspaceSession,
    workspaceGate,
  } = useLearningWorkspaceScreen();
  const [isActivatingExplore, setIsActivatingExplore] = React.useState(false);
  const isActivatingExploreRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const searchBarRef = React.useRef<SearchBarCommands>(null);
  const usesBottomToolbarSearch = supportsBottomToolbarSearch();
  const usesNativeSearchBar = Platform.OS === 'ios';
  const usesHeaderSearchBar = usesNativeSearchBar && !usesBottomToolbarSearch;
  const topChromePadding =
    insets.top +
    LEARNING_WORKSPACE_TOP_CHROME_OFFSET +
    LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE +
    theme.spacing.lg;

  React.useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    []
  );

  React.useEffect(() => {
    if (studyMode !== 'guide') {
      return;
    }

    navigateToStudyMode('explore');
  }, [navigateToStudyMode, studyMode]);

  React.useEffect(() => {
    if (
      studyMode !== 'explore' ||
      !workspaceSession?.id ||
      workspaceSession.sessionKind === 'explore' ||
      isActivatingExploreRef.current
    ) {
      return;
    }

    let ignoreResult = false;
    isActivatingExploreRef.current = true;
    setIsActivatingExplore(true);

    void submitLearningBridgeAction(workspaceSession.id, 'expand_step_to_explore', {}, token)
      .then((payload) => {
        if (ignoreResult) {
          return;
        }
        if (!payload?.session) {
          throw new Error('missing_explore_session');
        }
        replaceWorkspaceSession(payload.session);
      })
      .catch(() => {
        if (!ignoreResult) {
          toast.error('进入 Explore 失败，请稍后重试。');
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          isActivatingExploreRef.current = false;
          setIsActivatingExplore(false);
        }
      });

    return () => {
      ignoreResult = true;
    };
  }, [replaceWorkspaceSession, studyMode, token, workspaceSession?.id, workspaceSession?.sessionKind]);

  const handleSearchTextChange = React.useCallback(
    (value: unknown) => {
      setDraft(resolveSearchBarText(value));
    },
    [setDraft]
  );
  const handleSearchSubmit = React.useCallback(
    (value: unknown) => {
      if (!workspaceSession || workspaceSession.sessionKind !== 'explore') {
        return;
      }

      const nextDraft = resolveSearchBarText(value) || draft;
      void handleSend(nextDraft, {
        mode: 'explore',
        session: workspaceSession,
      });
      searchBarRef.current?.clearText();
      searchBarRef.current?.blur();
    },
    [draft, handleSend, workspaceSession]
  );
  const headerSearchBarOptions = React.useMemo(
    () =>
      usesHeaderSearchBar
        ? {
            hideNavigationBar: false,
            onCancelButtonPress: () => {
              setDraft('');
            },
            onChangeText: handleSearchTextChange,
            onSearchButtonPress: handleSearchSubmit,
            placement: 'automatic' as const,
            placeholder: '继续发散，追问细节...',
            ref: searchBarRef,
          }
        : undefined,
    [handleSearchSubmit, handleSearchTextChange, setDraft, usesHeaderSearchBar]
  );
  const plainHeaderOptions = React.useMemo(
    () => ({
      headerShadowVisible: false,
      title: '',
    }),
    []
  );
  const sharedHeaderOptions = React.useMemo(
    () => ({
      ...plainHeaderOptions,
      ...(headerSearchBarOptions ? { headerSearchBarOptions } : {}),
    }),
    [headerSearchBarOptions, plainHeaderOptions]
  );
  const nativeSearchBar = usesBottomToolbarSearch ? (
    <Stack.SearchBar
      ref={searchBarRef}
      allowToolbarIntegration
      hideNavigationBar={false}
      onCancelButtonPress={() => {
        Keyboard.dismiss();
        setDraft('');
      }}
      onChangeText={handleSearchTextChange}
      onSearchButtonPress={handleSearchSubmit}
      placeholder="继续发散，追问细节..."
    />
  ) : null;

  if (workspaceGate.kind !== 'ready') {
    return (
      <>
        <Stack.Screen options={plainHeaderOptions} />
        <View style={styles.routeContainer}>
          <LearningWorkspaceLoadingState
            description={workspaceGate.description}
            primaryAction={
              workspaceGate.kind === 'failed'
                ? {
                    label: isRetryPending ? '重新生成中...' : '重新生成',
                    onPress: () => {
                      void retryGenerate(profile?.id);
                    },
                  }
                : undefined
            }
            secondaryAction={{
              label: '返回导学本库',
              onPress: closeWorkspace,
            }}
            title={workspaceGate.title}
            tone={workspaceGate.kind === 'failed' ? 'danger' : 'neutral'}
          />
        </View>
      </>
    );
  }

  if (
    studyMode === 'guide' ||
    (workspaceGate.kind === 'ready' &&
      (!workspaceSession || workspaceSession.sessionKind !== 'explore' || isActivatingExplore))
  ) {
    return (
      <>
        <Stack.Screen options={plainHeaderOptions} />
        <View style={styles.routeContainer}>
          <LearningWorkspaceLoadingState
            description="正在进入 Explore 工作区。"
            secondaryAction={{
              label: '返回导学本库',
              onPress: closeWorkspace,
            }}
            title="切换到 Explore"
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={sharedHeaderOptions} />
      {nativeSearchBar}
      <View style={styles.routeContainer}>
        <ExplorePane
          messages={renderedMessages}
          onOpenOverview={openOverview}
          topPadding={topChromePadding}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heroChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paneScrollContent: {
    gap: 28,
    paddingBottom: 120,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  routeContainer: {
    flex: 1,
  },
});
