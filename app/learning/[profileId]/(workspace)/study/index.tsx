import { Stack } from 'expo-router';
import { EllipsisVertical, Sparkles, Target, X } from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

import { GlassSurface } from '@/components/base/glass-surface';
import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';
import { LearningWorkspaceScaffold } from '@/components/learning/learning-workspace-scaffold';
import {
  useLearningWorkspaceScreen,
  type LearningStudyMode,
} from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLearningSession, submitLearningBridgeAction } from '@/lib/api/learning';
import type { LearningBridgeAction } from '@/lib/api/types';
import { shouldAutoRouteGuideDraftToExplore } from '@/lib/learning/workspace';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const CloseIcon = X as IconComponent;
const MenuIcon = EllipsisVertical as IconComponent;
const SparklesIcon = Sparkles as IconComponent;
const TargetIcon = Target as IconComponent;

const RELATED_PROMPTS = [
  '这一步真正要解决什么问题？',
  '它和前面的步骤怎么连起来？',
  '给我一个更具体的例子。',
];

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

function WorkspaceHeaderButton({
  accessibilityLabel,
  icon,
  onPress,
  testID,
}: {
  accessibilityLabel: string;
  icon: React.ReactNode;
  onPress: () => void;
  testID: string;
}) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderSoft,
        borderRadius: 999,
        borderWidth: 1,
        height: 40,
        justifyContent: 'center',
        opacity: pressed ? 0.72 : 1,
        width: 40,
      })}
      testID={testID}>
      {icon}
    </Pressable>
  );
}

function WorkspaceHeroCard({
  body,
  chipLabel,
  criteriaBody,
  criteriaTitle,
  icon,
  status,
  title,
}: {
  body: string;
  chipLabel: string;
  criteriaBody: string;
  criteriaTitle: string;
  icon: React.ReactNode;
  status?: string | null;
  title: string;
}) {
  const { theme } = useAppTheme();

  return (
    <GlassSurface
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 28,
        padding: 20,
      }}>
      <View style={{ gap: 18 }}>
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

        <View style={{ gap: 8 }}>
          <Text
            selectable
            style={{
              color: theme.colors.text,
              ...theme.typography.bold,
              fontSize: 24,
              lineHeight: 30,
            }}>
            {title}
          </Text>
          <Text
            selectable
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 22,
            }}>
            {body}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.borderSoft,
            borderRadius: 20,
            borderWidth: 1,
            gap: 6,
            padding: 14,
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
      </View>
    </GlassSurface>
  );
}

function PromptDeck({
  prompts,
  onSelect,
}: {
  onSelect: (prompt: string) => void;
  prompts: string[];
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
        }}>
        推荐起手
      </Text>
      <View style={{ gap: 10 }}>
        {prompts.map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            onPress={() => onSelect(prompt)}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              borderRadius: 20,
              borderWidth: 1,
              opacity: pressed ? 0.76 : 1,
              padding: 14,
            })}>
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 20,
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
  messages,
  onAction,
}: {
  emptyLabel: string;
  messages: ReturnType<typeof useLearningWorkspaceScreen>['renderedMessages'];
  onAction: (action: LearningBridgeAction) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      <Text
        selectable
        style={{
          color: theme.colors.textSoft,
          ...theme.typography.semiBold,
          fontSize: 12,
        }}>
        学习线程
      </Text>
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

function StudyModeRail({
  description,
  onChange,
  studyMode,
}: {
  description: string;
  onChange: (mode: LearningStudyMode) => void;
  studyMode: LearningStudyMode;
}) {
  const { theme } = useAppTheme();

  return (
    <GlassSurface
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 16,
      }}>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text
            selectable
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.semiBold,
              fontSize: 12,
            }}>
            学习主线
          </Text>
          <Text
            selectable
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 13,
              lineHeight: 19,
            }}>
            {description}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.borderSoft,
            borderRadius: 18,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 6,
            padding: 6,
          }}>
          {[
            { label: 'Guide', mode: 'guide' as const },
            { label: 'Explore', mode: 'explore' as const },
          ].map((item) => {
            const isActive = studyMode === item.mode;

            return (
              <Pressable
                key={item.mode}
                accessibilityRole="button"
                onPress={() => onChange(item.mode)}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  backgroundColor: isActive ? theme.colors.surface : 'transparent',
                  borderColor: isActive ? theme.colors.borderStrong : 'transparent',
                  borderRadius: 14,
                  borderWidth: 1,
                  flex: 1,
                  justifyContent: 'center',
                  minHeight: 42,
                  opacity: pressed && !isActive ? 0.76 : 1,
                })}>
                <Text
                  selectable
                  style={{
                    color: isActive ? theme.colors.text : theme.colors.textSoft,
                    ...theme.typography.semiBold,
                    fontSize: 13,
                  }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </GlassSurface>
  );
}

function StudyActionStrip({
  onPrimaryActionPress,
  onSuggestionPress,
  primaryActionLabel,
  statusLabel,
  suggestions,
}: {
  onPrimaryActionPress?: () => void;
  onSuggestionPress?: (value: string) => void;
  primaryActionLabel?: string;
  statusLabel?: string | null;
  suggestions?: string[];
}) {
  const { theme } = useAppTheme();

  if (!statusLabel && !primaryActionLabel && (!suggestions || suggestions.length === 0)) {
    return null;
  }

  return (
    <View style={{ gap: 10 }}>
      {statusLabel ? (
        <Text
          selectable
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.medium,
            fontSize: 12,
          }}>
          {statusLabel}
        </Text>
      ) : null}

      {primaryActionLabel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onPrimaryActionPress}
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            opacity: pressed ? 0.76 : 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
          })}>
          <Text
            selectable
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.medium,
              fontSize: 13,
            }}>
            {primaryActionLabel}
          </Text>
        </Pressable>
      ) : null}

      {suggestions && suggestions.length > 0 ? (
        <ScrollView
          horizontal
          contentContainerStyle={{ gap: 10, paddingRight: 4 }}
          showsHorizontalScrollIndicator={false}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              onPress={() => onSuggestionPress?.(suggestion)}
              style={({ pressed }) => ({
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                opacity: pressed ? 0.76 : 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
              })}>
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                }}>
                {suggestion}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function GuidePane({
  messages,
  onAction,
  onPromptSelect,
}: {
  messages: ReturnType<typeof useLearningWorkspaceScreen>['renderedMessages'];
  onAction: (action: LearningBridgeAction) => void;
  onPromptSelect: (prompt: string) => void;
}) {
  const { latestSessionSignal, profile, starterPrompts, workspaceSession } =
    useLearningWorkspaceScreen();
  const currentStep = profile?.curriculum[workspaceSession?.currentStepIndex ?? 0] ?? null;

  return (
    <ScrollView
      contentContainerStyle={styles.paneScrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}>
      <WorkspaceHeroCard
        body={currentStep?.goal ?? '围绕当前步骤推进理解、回答、评测和补强，不丢主线。'}
        chipLabel="当前步骤"
        criteriaBody={
          currentStep?.successCriteria ??
          currentStep?.guidingQuestion ??
          '先用自己的话说明关键概念、判断依据或下一步打算。'
        }
        criteriaTitle="通过标准"
        icon={<SparklesIcon color="#4E6379" size={14} />}
        status={latestSessionSignal?.transitionLabel ?? workspaceSession?.progressLabel}
        title={workspaceSession?.currentStepTitle ?? '当前学习步骤'}
      />

      <PromptDeck onSelect={onPromptSelect} prompts={starterPrompts} />

      <ConversationSection
        emptyLabel="先说说你对这一步的初步理解，导师会围绕当前目标给出结构化回应。"
        messages={messages}
        onAction={onAction}
      />
    </ScrollView>
  );
}

function ExplorePane({
  messages,
  onAction,
}: {
  messages: ReturnType<typeof useLearningWorkspaceScreen>['renderedMessages'];
  onAction: (action: LearningBridgeAction) => void;
}) {
  const { sourceSummary, workspaceSession } = useLearningWorkspaceScreen();
  const focusTitle =
    workspaceSession?.focusContext && typeof workspaceSession.focusContext.stepTitle === 'string'
      ? String(workspaceSession.focusContext.stepTitle)
      : workspaceSession?.currentStepTitle ?? '当前主题';

  return (
    <ScrollView
      contentContainerStyle={styles.paneScrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}>
      <WorkspaceHeroCard
        body={sourceSummary || '围绕当前步骤发散提问，并把有价值的探索结果收回主线。'}
        chipLabel="Explore 焦点"
        criteriaBody="先给 grounded answer，再看相关概念，最后决定是否收编回 Guide。"
        criteriaTitle="这轮玩法"
        icon={<TargetIcon color="#4E6379" size={14} />}
        status={workspaceSession?.sourceSessionId ? '与 Guide 主线保持联动' : '自由探索'}
        title={`围绕“${focusTitle}”发散探索`}
      />

      <ConversationSection
        emptyLabel="问一个更细、更偏应用或更偏例子的延展问题，系统会基于当前资料给出答案。"
        messages={messages}
        onAction={onAction}
      />
    </ScrollView>
  );
}

export default function LearningWorkspaceStudyRoute() {
  const { token } = useAppSession();
  const { theme } = useAppTheme();
  const {
    closeWorkspace,
    draft,
    handleSend,
    latestStatus,
    navigateToStudyMode,
    openOverview,
    profile,
    renderedMessages,
    replaceWorkspaceSession,
    setDraft,
    sourceSummary,
    starterPrompts,
    studyMode,
    workspaceSession,
  } = useLearningWorkspaceScreen();
  const { width } = useWindowDimensions();
  const pagerRef = React.useRef<ScrollView>(null);
  const hasSyncedPager = React.useRef(false);
  const pendingExploreDraftRef = React.useRef<string | null>(null);
  const paneWidth = Math.max(width, 1);

  React.useEffect(() => {
    const targetOffset = studyMode === 'explore' ? paneWidth : 0;

    pagerRef.current?.scrollTo({
      animated: hasSyncedPager.current,
      x: targetOffset,
      y: 0,
    });
    hasSyncedPager.current = true;
  }, [paneWidth, studyMode]);

  React.useEffect(() => {
    const pendingDraft = pendingExploreDraftRef.current;
    if (
      !pendingDraft ||
      studyMode !== 'explore' ||
      workspaceSession?.sessionKind !== 'explore'
    ) {
      return;
    }

    pendingExploreDraftRef.current = null;
    void handleSend(pendingDraft);
  }, [handleSend, studyMode, workspaceSession?.id, workspaceSession?.sessionKind]);

  const handleExpandToExplore = React.useCallback(async () => {
    if (!workspaceSession?.id) {
      return false;
    }

    try {
      const payload = await submitLearningBridgeAction(
        workspaceSession.id,
        'expand_step_to_explore',
        {},
        token
      );
      if (!payload?.session) {
        throw new Error('missing_explore_session');
      }
      replaceWorkspaceSession(payload.session);
      navigateToStudyMode('explore');
      return true;
    } catch {
      toast.error('进入 Explore 失败，请稍后重试。');
      return false;
    }
  }, [navigateToStudyMode, replaceWorkspaceSession, token, workspaceSession?.id]);

  const handleCollectToGuide = React.useCallback(
    async (action?: LearningBridgeAction) => {
      if (!workspaceSession?.id) {
        return;
      }

      try {
        await submitLearningBridgeAction(
          workspaceSession.id,
          'attach_explore_turn_to_guide_step',
          {
            targetGuideSessionId:
              action?.targetGuideSessionId ?? workspaceSession.sourceSessionId ?? undefined,
            targetStepIndex:
              action?.targetStepIndex ?? workspaceSession.focusStepIndex ?? undefined,
            turnId: action?.turnId ?? undefined,
          },
          token
        );

        if (workspaceSession.sourceSessionId) {
          const guideSession = await getLearningSession(workspaceSession.sourceSessionId, token);
          replaceWorkspaceSession(guideSession);
        }
        navigateToStudyMode('guide');
        toast.success('已收编回当前 Guide 步骤');
      } catch {
        toast.error('收编失败，请重试');
      }
    },
    [
      navigateToStudyMode,
      replaceWorkspaceSession,
      token,
      workspaceSession?.focusStepIndex,
      workspaceSession?.id,
      workspaceSession?.sourceSessionId,
    ]
  );

  const handleBridgeAction = React.useCallback(
    async (action: LearningBridgeAction) => {
      if (action.actionType === 'expand_step_to_explore') {
        await handleExpandToExplore();
        return;
      }

      if (action.actionType === 'attach_explore_turn_to_guide_step') {
        await handleCollectToGuide(action);
      }
    },
    [handleCollectToGuide, handleExpandToExplore]
  );

  const handleModeChange = React.useCallback(
    async (nextMode: LearningStudyMode) => {
      if (nextMode === studyMode) {
        return;
      }

      if (nextMode === 'explore') {
        await handleExpandToExplore();
        return;
      }

      if (workspaceSession?.sessionKind === 'explore' && workspaceSession.sourceSessionId) {
        try {
          const guideSession = await getLearningSession(workspaceSession.sourceSessionId, token);
          replaceWorkspaceSession(guideSession);
        } catch {
          toast.error('返回 Guide 失败，请稍后重试。');
          return;
        }
      }

      navigateToStudyMode('guide');
    },
    [
      handleExpandToExplore,
      navigateToStudyMode,
      replaceWorkspaceSession,
      studyMode,
      token,
      workspaceSession?.sessionKind,
      workspaceSession?.sourceSessionId,
    ]
  );

  const composerSuggestions =
    studyMode === 'guide'
      ? starterPrompts.length > 0
        ? starterPrompts
        : RELATED_PROMPTS
      : RELATED_PROMPTS;
  const latestBridgeAction = React.useMemo(() => {
    const assistantMessages = [...renderedMessages]
      .filter((message) => message.role === 'assistant')
      .reverse();

    for (const message of assistantMessages) {
      const action = message.presentation?.bridgeActions?.[0];
      if (action) {
        return action;
      }
    }

    return null;
  }, [renderedMessages]);

  const handleSearchTextChange = React.useCallback(
    (value: unknown) => {
      setDraft(resolveSearchBarText(value));
    },
    [setDraft]
  );
  const handleSearchSubmit = React.useCallback(
    (value: unknown) => {
      const nextDraft = resolveSearchBarText(value) || draft;
      if (studyMode === 'guide' && shouldAutoRouteGuideDraftToExplore(nextDraft)) {
        pendingExploreDraftRef.current = nextDraft;
        setDraft(nextDraft);
        void handleExpandToExplore().then((didSwitch) => {
          if (!didSwitch && pendingExploreDraftRef.current === nextDraft) {
            pendingExploreDraftRef.current = null;
          }
        });
        return;
      }

      void handleSend(nextDraft);
    },
    [draft, handleExpandToExplore, handleSend, setDraft, studyMode]
  );
  const renderHeaderLeft = React.useCallback(
    () => (
      <WorkspaceHeaderButton
        accessibilityLabel="返回导学本库"
        icon={<CloseIcon color={theme.colors.text} size={18} strokeWidth={2.2} />}
        onPress={closeWorkspace}
        testID="learning-workspace-close-button"
      />
    ),
    [closeWorkspace, theme.colors.text]
  );
  const renderHeaderRight = React.useCallback(
    () => (
      <WorkspaceHeaderButton
        accessibilityLabel="打开导学概览"
        icon={<MenuIcon color={theme.colors.text} size={18} strokeWidth={2.2} />}
        onPress={openOverview}
        testID="learning-workspace-info-button"
      />
    ),
    [openOverview, theme.colors.text]
  );
  const headerSearchBarOptions = React.useMemo(
    () => ({
      hideNavigationBar: false,
      onCancelButtonPress: () => {
        setDraft('');
      },
      onChangeText: handleSearchTextChange,
      onSearchButtonPress: handleSearchSubmit,
      placement: 'automatic' as const,
      placeholder:
        studyMode === 'guide' ? '回复导师，推进当前步骤...' : '继续发散，追问细节...',
    }),
    [handleSearchSubmit, handleSearchTextChange, setDraft, studyMode]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: renderHeaderLeft,
          headerRight: renderHeaderRight,
          headerSearchBarOptions,
          title: profile?.title ?? '',
        }}
      />
      <LearningWorkspaceScaffold showHeader={false}>
        <View style={styles.screen}>
          <View style={styles.railContainer}>
            <StudyModeRail
              description={
                studyMode === 'guide'
                  ? '围绕当前步骤推进理解、回答和评测反馈。'
                  : sourceSummary || '从当前步骤发散提问，并把有价值的探索结果收回主线。'
              }
              onChange={(nextMode) => {
                void handleModeChange(nextMode);
              }}
              studyMode={studyMode}
            />
          </View>

          <View style={styles.actionContainer}>
            <StudyActionStrip
              onPrimaryActionPress={() => {
                void (
                  studyMode === 'guide'
                    ? handleExpandToExplore()
                    : handleCollectToGuide(latestBridgeAction ?? undefined)
                );
              }}
              onSuggestionPress={(value) => {
                void handleSend(value);
              }}
              primaryActionLabel={
                studyMode === 'guide'
                  ? '转去 Explore 深挖'
                  : latestBridgeAction?.turnId
                    ? '收编到当前步骤'
                    : undefined
              }
              statusLabel={latestStatus?.label ?? null}
              suggestions={composerSuggestions}
            />
          </View>

          <ScrollView
            horizontal
            onMomentumScrollEnd={(event) => {
              const nextMode =
                event.nativeEvent.contentOffset.x >= paneWidth / 2 ? 'explore' : 'guide';
              if (nextMode !== studyMode) {
                void handleModeChange(nextMode);
              }
            }}
            pagingEnabled
            ref={pagerRef}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            style={styles.pager}>
            <View style={[styles.pane, { width: paneWidth }]}>
              <GuidePane
                messages={renderedMessages}
                onAction={handleBridgeAction}
                onPromptSelect={(prompt) => {
                  void handleSend(prompt);
                }}
              />
            </View>
            <View style={[styles.pane, { width: paneWidth }]}>
              <ExplorePane messages={renderedMessages} onAction={handleBridgeAction} />
            </View>
          </ScrollView>
        </View>
      </LearningWorkspaceScaffold>
    </>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    paddingHorizontal: 20,
  },
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
  pane: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  paneScrollContent: {
    gap: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  railContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  screen: {
    flex: 1,
    gap: 12,
  },
});
