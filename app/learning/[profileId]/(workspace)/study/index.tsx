import { Stack } from 'expo-router';
import React from 'react';
import {
  Keyboard,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SearchBarCommands } from 'react-native-screens';
import { toast } from 'sonner-native';
import Animated from 'react-native-reanimated';


import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';
import { LearningComposer } from '@/components/learning/learning-composer';
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

function StarterPromptStrip({
  prompts,
  onPromptPress,
}: {
  prompts: string[];
  onPromptPress: (prompt: string) => void;
}) {
  const { theme } = useAppTheme();

  if (prompts.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 12 }}>
      <Text
        selectable
        style={{
          color: theme.colors.textSoft,
          ...theme.typography.semiBold,
          fontSize: 12,
          letterSpacing: 0.4,
        }}>
        从这些问题开始
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {prompts.map((prompt, index) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            onPress={() => onPromptPress(prompt)}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              opacity: pressed ? 0.84 : 1,
              paddingHorizontal: 14,
              paddingVertical: 10,
            })}
            testID={`learning-workspace-starter-prompt-${index}`}>
            <Text
              selectable
              style={{
                color: theme.colors.text,
                ...theme.typography.body,
                fontSize: 14,
              }}>
              {prompt}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function ConversationSection({
  emptyLabel,
  focusMessageId,
  messages,
  onAction,
  onFocusAnchorYChange,
}: {
  emptyLabel: string;
  focusMessageId?: string | null;
  messages: ReturnType<typeof useLearningWorkspaceScreen>['renderedMessages'];
  onAction?: (action: LearningBridgeAction) => void;
  onFocusAnchorYChange?: (y: number | null) => void;
}) {
  const { theme } = useAppTheme();
  const sectionYRef = React.useRef(0);
  const focusLocalYRef = React.useRef<number | null>(null);

  const commitFocusAnchor = React.useCallback(() => {
    if (!onFocusAnchorYChange) {
      return;
    }

    if (!focusMessageId || focusLocalYRef.current === null) {
      onFocusAnchorYChange(null);
      return;
    }

    onFocusAnchorYChange(sectionYRef.current + focusLocalYRef.current);
  }, [focusMessageId, onFocusAnchorYChange]);

  const handleSectionLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      sectionYRef.current = event.nativeEvent.layout.y;
      commitFocusAnchor();
    },
    [commitFocusAnchor]
  );

  const handleFocusMessageLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      focusLocalYRef.current = event.nativeEvent.layout.y;
      commitFocusAnchor();
    },
    [commitFocusAnchor]
  );

  React.useEffect(() => {
    focusLocalYRef.current = null;
    if (!focusMessageId) {
      onFocusAnchorYChange?.(null);
    }
  }, [focusMessageId, onFocusAnchorYChange]);

  return (
    <View onLayout={handleSectionLayout} style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: 14 }}>
        {messages.length > 0 ? (
          messages.map((message) => (
            <View
              key={message.id}
              onLayout={message.id === focusMessageId ? handleFocusMessageLayout : undefined}>
              <LearningConversationMessage
                message={message}
                onAction={onAction}
              />
            </View>
          ))
        ) : (
          <View
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
          </View>
        )}
      </View>
    </View>
  );
}

function ExplorePane({
  emptyLabel,
  messages,
  onAction,
  onPromptPress,
  onScrollToEndRequest,
  starterPrompts,
  topPadding,
}: {
  emptyLabel: string;
  messages: ReturnType<typeof useLearningWorkspaceScreen>['renderedMessages'];
  onAction?: (action: LearningBridgeAction) => void;
  onPromptPress: (prompt: string) => void;
  onScrollToEndRequest?: (fn: () => void) => void;
  starterPrompts: string[];
  topPadding?: number;
}) {
  const { theme } = useAppTheme();
  const [focusAnchorY, setFocusAnchorY] = React.useState<number | null>(null);
  const focusMessageId = React.useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === 'user') {
        return messages[index]?.id ?? null;
      }
    }

    return messages.length > 0 ? messages[messages.length - 1]?.id ?? null : null;
  }, [messages]);

  React.useEffect(() => {
    setFocusAnchorY(null);
  }, [focusMessageId]);

  return (
    <LearningConversationScroll
      contentContainerStyle={[
        styles.paneScrollContent,
        topPadding ? { paddingTop: topPadding } : null,
      ]}
      contentInsetAdjustmentBehavior="never"
      focusAnchorOffset={(topPadding ?? 0) + 24}
      focusAnchorY={focusAnchorY}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      onScrollToEndRequest={onScrollToEndRequest}
      showsVerticalScrollIndicator={false}
      testID="learning-workspace-screen">
      <View style={{ gap: 28 }}>
        {messages.length === 0 ? (
          <StarterPromptStrip onPromptPress={onPromptPress} prompts={starterPrompts} />
        ) : null}
        <ConversationSection
          emptyLabel={emptyLabel}
          focusMessageId={focusMessageId}
          messages={messages}
          onAction={onAction}
          onFocusAnchorYChange={setFocusAnchorY}
        />
      </View>
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
    latestStatus,
    navigateToStudyMode,
    profile,
    renderedMessages,
    replaceWorkspaceSession,
    retryGenerate,
    setDraft,
    starterPrompts,
    studyMode,
    workspaceSession,
    workspaceGate,
  } = useLearningWorkspaceScreen();
  const [isActivatingExplore, setIsActivatingExplore] = React.useState(false);
  const scrollToEndRef = React.useRef<(() => void) | null>(null);
  const isActivatingExploreRef = React.useRef(false);
  const isMountedRef = React.useRef(true);
  const searchBarRef = React.useRef<SearchBarCommands>(null);
  const usesBottomToolbarSearch = supportsBottomToolbarSearch();
  const usesNativeSearchBar = Platform.OS === 'ios';
  const usesHeaderSearchBar = usesNativeSearchBar && !usesBottomToolbarSearch;
  const activeSessionKind = studyMode === 'guide' ? 'guide' : 'explore';
  const inputPlaceholder =
    studyMode === 'guide' ? '围绕当前导学问题继续作答...' : '继续发散，追问细节...';
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
    // On keyboard show, scroll so the last message is above the keyboard
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const showSub = Keyboard.addListener(showEvent, () => {
      scrollToEndRef.current?.();
    });
    return () => showSub.remove();
  }, []);

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
      if (!workspaceSession || workspaceSession.sessionKind !== activeSessionKind) {
        return;
      }

      const nextDraft = resolveSearchBarText(value) || draft;
      void handleSend(nextDraft, {
        mode: studyMode,
        session: workspaceSession,
      });
      searchBarRef.current?.clearText();
      searchBarRef.current?.blur();
    },
    [activeSessionKind, draft, handleSend, studyMode, workspaceSession]
  );
  const handleStarterPromptPress = React.useCallback(
    (prompt: string) => {
      if (!workspaceSession || workspaceSession.sessionKind !== activeSessionKind) {
        return;
      }

      setDraft(prompt);
      void handleSend(prompt, {
        mode: studyMode,
        session: workspaceSession,
      });
    },
    [activeSessionKind, handleSend, setDraft, studyMode, workspaceSession]
  );
  const handleConversationAction = React.useCallback(
    (action: LearningBridgeAction) => {
      if (!workspaceSession) {
        return;
      }

      void submitLearningBridgeAction(
        workspaceSession.id,
        action.actionType,
        {
          targetGuideSessionId:
            typeof action.targetGuideSessionId === 'number' ? action.targetGuideSessionId : undefined,
          targetStepIndex:
            typeof action.targetStepIndex === 'number' ? action.targetStepIndex : undefined,
          turnId: typeof action.turnId === 'number' ? action.turnId : undefined,
        },
        token
      ).catch(() => {
        toast.error('执行这条导学动作失败，请稍后重试。');
      });
    },
    [token, workspaceSession]
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
            placeholder: inputPlaceholder,
            ref: searchBarRef,
          }
        : undefined,
    [handleSearchSubmit, handleSearchTextChange, inputPlaceholder, setDraft, usesHeaderSearchBar]
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
      placeholder={inputPlaceholder}
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
            visualState={workspaceGate.kind === 'loading' ? 'skeleton' : 'copy'}
          />
        </View>
      </>
    );
  }

  if (workspaceGate.kind === 'ready' && (!workspaceSession || workspaceSession.sessionKind !== activeSessionKind)) {
    return (
      <>
        <Stack.Screen options={plainHeaderOptions} />
        <View style={styles.routeContainer}>
          <LearningWorkspaceLoadingState
            description={
              studyMode === 'guide' ? '正在进入 Guide 工作区。' : '正在进入 Explore 工作区。'
            }
            secondaryAction={{
              label: '返回导学本库',
              onPress: closeWorkspace,
            }}
            title={studyMode === 'guide' ? '切换到 Guide' : '切换到 Explore'}
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
          emptyLabel={
            studyMode === 'guide'
              ? '围绕当前导学问题继续作答，导师会补充讲解、追问，或推进到下一步。'
              : '问一个更细、更偏应用或更偏例子的延展问题，系统会基于当前资料给出答案。'
          }
          messages={renderedMessages}
          onAction={handleConversationAction}
          onPromptPress={handleStarterPromptPress}
          onScrollToEndRequest={(fn) => { scrollToEndRef.current = fn; }}
          starterPrompts={usesNativeSearchBar ? starterPrompts : []}
          topPadding={topChromePadding}
        />
        {!usesNativeSearchBar ? (
          <View style={styles.composerDock}>
            <LearningComposer
              draft={draft}
              inputTestID="learning-workspace-composer-input"
              onChangeText={setDraft}
              onSend={() => {
                void handleSearchSubmit(draft);
              }}
              onSuggestionPress={handleStarterPromptPress}
              placeholder={inputPlaceholder}
              sendButtonTestID="learning-workspace-composer-send"
              suggestions={renderedMessages.length === 0 ? starterPrompts : []}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  paneScrollContent: {
    gap: 28,
    paddingBottom: 120,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  routeContainer: {
    flex: 1,
  },
  composerDock: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
