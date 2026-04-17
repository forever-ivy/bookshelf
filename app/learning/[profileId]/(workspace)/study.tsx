import { ArrowUp, Compass, Inbox, Sparkles, Target } from 'lucide-react-native';
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { LearningWorkspaceScaffold } from '@/components/learning/learning-workspace-scaffold';
import {
  useLearningWorkspaceScreen,
  type LearningStudyMode,
} from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { submitLearningBridgeAction } from '@/lib/api/learning';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const ArrowUpIcon = ArrowUp as IconComponent;
const CompassIcon = Compass as IconComponent;
const InboxIcon = Inbox as IconComponent;
const SparklesIcon = Sparkles as IconComponent;
const TargetIcon = Target as IconComponent;

const RELATED_PROMPTS = ['这一步真正要解决什么问题?', '它和前面的步骤怎么连起来?', '给我一个更具体的例子'];

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
    <View
      style={[
        styles.modeRailCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderSoft,
        },
      ]}>
      <View style={styles.modeRailHeader}>
        <Text
          style={[
            styles.modeRailEyebrow,
            {
              color: theme.colors.primaryStrong,
              fontFamily: theme.typography.semiBold.fontFamily,
            },
          ]}>
          学习主线
        </Text>
        <Text
          style={[
            styles.modeRailDescription,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.body.fontFamily,
            },
          ]}>
          {description}
        </Text>
      </View>
      <View
        style={[
          styles.modeRail,
          {
            backgroundColor: theme.colors.surfaceTint,
            borderColor: theme.colors.borderSoft,
          },
        ]}>
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
              style={({ pressed }) => [
                styles.modeRailButton,
                {
                  backgroundColor: isActive ? theme.colors.surface : 'transparent',
                  borderColor: isActive ? theme.colors.borderStrong : 'transparent',
                  opacity: pressed && !isActive ? 0.72 : 1,
                },
              ]}>
              <Text
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
  );
}

function GuidePane() {
  const { theme } = useAppTheme();
  const { latestEvaluation, latestSessionSignal, renderedMessages, starterPrompts, workspaceSession, profile } =
    useLearningWorkspaceScreen();
  const currentStep = profile?.curriculum[workspaceSession?.currentStepIndex ?? 0] ?? null;

  return (
    <ScrollView contentContainerStyle={styles.paneScrollContent} showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}>
        <View style={styles.heroHeader}>
          <View
            style={[
              styles.heroChip,
              {
                backgroundColor: theme.colors.primarySoft,
              },
            ]}>
            <SparklesIcon color={theme.colors.primaryStrong} size={14} />
            <Text
              style={[
                styles.heroChipText,
                {
                  color: theme.colors.primaryStrong,
                  fontFamily: theme.typography.semiBold.fontFamily,
                },
              ]}>
              当前步骤
            </Text>
          </View>
          <Text
            style={[
              styles.heroStatus,
              {
                color: theme.colors.textSoft,
                fontFamily: theme.typography.medium.fontFamily,
              },
            ]}>
            {latestSessionSignal?.transitionLabel ?? workspaceSession?.progressLabel ?? '继续推进主线'}
          </Text>
        </View>
        <Text
          style={[
            styles.heroTitle,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.bold.fontFamily,
            },
          ]}>
          {workspaceSession?.currentStepTitle ?? '当前学习步骤'}
        </Text>
        <Text
          style={[
            styles.heroBody,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.body.fontFamily,
            },
          ]}>
          {currentStep?.goal ?? '先把这一步真正要学会的目标说清楚，再决定是否进入发散探索。'}
        </Text>

        <View
          style={[
            styles.goalCard,
            {
              backgroundColor: theme.colors.surfaceTint,
              borderColor: theme.colors.borderSoft,
            },
          ]}>
          <Text
            style={[
              styles.goalLabel,
              {
                color: theme.colors.textSoft,
                fontFamily: theme.typography.semiBold.fontFamily,
              },
            ]}>
            当前目标
          </Text>
          <Text
            style={[
              styles.goalValue,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.semiBold.fontFamily,
              },
            ]}>
            {currentStep?.guidingQuestion ?? '先用一句话说说你已经理解到哪里了。'}
          </Text>
        </View>
      </View>

      {starterPrompts.length > 0 ? (
        <View style={styles.promptsBlock}>
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.colors.textSoft,
                fontFamily: theme.typography.semiBold.fontFamily,
              },
            ]}>
            推荐起手
          </Text>
          <View style={styles.promptList}>
            {starterPrompts.map((prompt) => (
              <View
                key={prompt}
                style={[
                  styles.promptCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderSoft,
                  },
                ]}>
                <Text
                  style={[
                    styles.promptText,
                    {
                      color: theme.colors.textMuted,
                      fontFamily: theme.typography.body.fontFamily,
                    },
                  ]}>
                  {prompt}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.threadBlock}>
        <Text
          style={[
            styles.sectionLabel,
            {
              color: theme.colors.textSoft,
              fontFamily: theme.typography.semiBold.fontFamily,
            },
          ]}>
          学习线程
        </Text>
        <View style={styles.threadList}>
          {renderedMessages.map((message) => (
            <LearningChatBubble
              key={message.id}
              role={message.role}
              streaming={message.streaming}
              text={message.text}
            />
          ))}
        </View>
      </View>

      {latestEvaluation ? (
        <View
          style={[
            styles.evaluationCard,
            {
              backgroundColor: latestEvaluation.passed
                ? theme.colors.availabilityReadySoft
                : theme.colors.warningSoft,
              borderColor: latestEvaluation.passed
                ? theme.colors.availabilityReady
                : theme.colors.warning,
            },
          ]}>
          <Text
            style={[
              styles.evaluationLabel,
              {
                color: latestEvaluation.passed ? theme.colors.success : theme.colors.warning,
                fontFamily: theme.typography.semiBold.fontFamily,
              },
            ]}>
            {latestEvaluation.passed ? '通过当前步骤' : '还需要再打磨'}
          </Text>
          <Text
            style={[
              styles.evaluationBody,
              {
                color: theme.colors.text,
                fontFamily: theme.typography.body.fontFamily,
              },
            ]}>
            {latestEvaluation.feedback}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ExplorePane({
  onCollect,
}: {
  onCollect: () => Promise<void>;
}) {
  const { theme } = useAppTheme();
  const { renderedMessages, sourceSummary, workspaceSession } = useLearningWorkspaceScreen();

  return (
    <ScrollView contentContainerStyle={styles.paneScrollContent} showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}>
        <View style={styles.heroHeader}>
          <View
            style={[
              styles.heroChip,
              {
                backgroundColor: theme.colors.primarySoft,
              },
            ]}>
            <TargetIcon color={theme.colors.primaryStrong} size={14} />
            <Text
              style={[
                styles.heroChipText,
                {
                  color: theme.colors.primaryStrong,
                  fontFamily: theme.typography.semiBold.fontFamily,
                },
              ]}>
              Explore 焦点
            </Text>
          </View>
          <Text
            style={[
              styles.heroStatus,
              {
                color: theme.colors.textSoft,
                fontFamily: theme.typography.medium.fontFamily,
              },
            ]}>
            从 Guide 当前步骤扩展
          </Text>
        </View>
        <Text
          style={[
            styles.heroTitle,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.bold.fontFamily,
            },
          ]}>
          围绕 “{workspaceSession?.currentStepTitle ?? '当前主题'}” 发散探索
        </Text>
        <Text
          style={[
            styles.heroBody,
            {
              color: theme.colors.textMuted,
              fontFamily: theme.typography.body.fontFamily,
            },
          ]}>
          {sourceSummary || '保留自由提问的空间，同时把有价值的探索结果收回到主线步骤里。'}
        </Text>
      </View>

      <View style={styles.threadBlock}>
        <Text
          style={[
            styles.sectionLabel,
            {
              color: theme.colors.textSoft,
              fontFamily: theme.typography.semiBold.fontFamily,
            },
          ]}>
          探索对话
        </Text>
        <View style={styles.threadList}>
          {renderedMessages.map((message, index) => (
            <View key={message.id}>
              <LearningChatBubble role={message.role} streaming={message.streaming} text={message.text} />
              {message.role === 'assistant' &&
              index === renderedMessages.length - 1 &&
              !message.streaming ? (
                <View style={styles.collectRow}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void onCollect();
                    }}
                    style={({ pressed }) => [
                      styles.collectButton,
                      {
                        backgroundColor: theme.colors.surfaceTint,
                        borderColor: theme.colors.borderSoft,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}>
                    <InboxIcon color={theme.colors.systemBlue} size={16} />
                    <Text
                      style={[
                        styles.collectText,
                        {
                          color: theme.colors.systemBlue,
                          fontFamily: theme.typography.medium.fontFamily,
                        },
                      ]}>
                      收编到当前步骤
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function LearningWorkspaceStudyRoute() {
  const { theme } = useAppTheme();
  const { token } = useAppSession();
  const {
    draft,
    handleSend,
    navigateToStudyMode,
    setDraft,
    sourceSummary,
    studyMode,
    workspaceSession,
  } = useLearningWorkspaceScreen();
  const { width } = useWindowDimensions();
  const pagerRef = React.useRef<ScrollView>(null);
  const hasSyncedPager = React.useRef(false);
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

  const handleExploreBridge = React.useCallback(async () => {
    if (workspaceSession?.id) {
      try {
        await submitLearningBridgeAction(workspaceSession.id, 'expand_step_to_explore', {}, token);
      } catch {
        // Preserve the visual transition even if the side effect fails.
      }
    }

    navigateToStudyMode('explore');
  }, [navigateToStudyMode, token, workspaceSession?.id]);

  const handleCollectToGuide = React.useCallback(async () => {
    if (!workspaceSession?.id) {
      return;
    }

    try {
      await submitLearningBridgeAction(
        workspaceSession.id,
        'attach_explore_turn_to_guide_step',
        {},
        token
      );
      toast.success(`已收录至: ${workspaceSession.currentStepTitle ?? '当前步骤'}`);
    } catch {
      toast.error('收录失败，请重试');
    }
  }, [token, workspaceSession]);

  const guideFooter = (
    <View style={styles.footerStack}>
      <View style={styles.footerActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void handleExploreBridge();
          }}
          style={({ pressed }) => [
            styles.bridgeButton,
            {
              backgroundColor: theme.colors.surfaceTint,
              borderColor: theme.colors.borderSoft,
              opacity: pressed ? 0.76 : 1,
            },
          ]}>
          <CompassIcon color={theme.colors.primaryStrong} size={16} />
          <Text
            style={[
              styles.bridgeText,
              {
                color: theme.colors.primaryStrong,
                fontFamily: theme.typography.medium.fontFamily,
              },
            ]}>
            深度探索
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="回复导师..."
          placeholderTextColor={theme.colors.textSoft}
          style={[
            styles.textInput,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.body.fontFamily,
            },
          ]}
          value={draft}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!draft.trim()}
          onPress={() => {
            void handleSend(draft);
          }}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: draft.trim() ? theme.colors.primaryStrong : theme.colors.surfaceMuted,
              opacity: pressed ? 0.84 : 1,
            },
          ]}>
          <ArrowUpIcon color={draft.trim() ? theme.colors.surface : theme.colors.textSoft} size={20} />
        </Pressable>
      </View>
    </View>
  );

  const exploreFooter = (
    <View style={styles.footerStack}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.relatedScrollContent}
        showsHorizontalScrollIndicator={false}>
        {RELATED_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            accessibilityRole="button"
            onPress={() => {
              void handleSend(prompt);
            }}
            style={({ pressed }) => [
              styles.relatedPill,
              {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.borderSoft,
                opacity: pressed ? 0.76 : 1,
              },
            ]}>
            <Text
              style={[
                styles.relatedPillText,
                {
                  color: theme.colors.textSoft,
                  fontFamily: theme.typography.body.fontFamily,
                },
              ]}>
              {prompt}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
          },
        ]}>
        <TextInput
          multiline
          onChangeText={setDraft}
          placeholder="继续发散，追问细节..."
          placeholderTextColor={theme.colors.textSoft}
          style={[
            styles.textInput,
            {
              color: theme.colors.text,
              fontFamily: theme.typography.body.fontFamily,
            },
          ]}
          value={draft}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!draft.trim()}
          onPress={() => {
            void handleSend(draft);
          }}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: draft.trim() ? theme.colors.primaryStrong : theme.colors.surfaceMuted,
              opacity: pressed ? 0.84 : 1,
            },
          ]}>
          <ArrowUpIcon color={draft.trim() ? theme.colors.surface : theme.colors.textSoft} size={20} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <LearningWorkspaceScaffold
      footer={studyMode === 'guide' ? guideFooter : exploreFooter}
      subtitle={studyMode === 'guide' ? '主线学习' : '发散探索'}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <View style={styles.railContainer}>
          <StudyModeRail
            description={
              studyMode === 'guide'
                ? '围绕当前步骤推进理解、回答和评测反馈。'
                : sourceSummary || '从当前步骤发散提问，并把有价值的探索结果收回主线。'
            }
            onChange={navigateToStudyMode}
            studyMode={studyMode}
          />
        </View>

        <ScrollView
          horizontal
          onMomentumScrollEnd={(event) => {
            const nextMode = event.nativeEvent.contentOffset.x >= paneWidth / 2 ? 'explore' : 'guide';
            if (nextMode !== studyMode) {
              navigateToStudyMode(nextMode);
            }
          }}
          pagingEnabled
          ref={pagerRef}
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={styles.pager}>
          <View style={[styles.pane, { width: paneWidth }]}>
            <GuidePane />
          </View>
          <View style={[styles.pane, { width: paneWidth }]}>
            <ExplorePane onCollect={handleCollectToGuide} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LearningWorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  bridgeButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bridgeText: {
    fontSize: 13,
  },
  collectButton: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  collectRow: {
    alignItems: 'flex-start',
    marginTop: 12,
  },
  collectText: {
    fontSize: 13,
  },
  evaluationBody: {
    fontSize: 14,
    lineHeight: 21,
  },
  evaluationCard: {
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  evaluationLabel: {
    fontSize: 13,
  },
  footerActions: {
    alignItems: 'flex-start',
  },
  footerStack: {
    gap: 10,
  },
  goalCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 14,
  },
  goalLabel: {
    fontSize: 12,
  },
  goalValue: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  heroChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  heroChipText: {
    fontSize: 12,
  },
  heroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatus: {
    flex: 1,
    fontSize: 12,
    marginLeft: 12,
    textAlign: 'right',
  },
  heroTitle: {
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  inputWrapper: {
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  modeRail: {
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 6,
  },
  modeRailButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modeRailCard: {
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  modeRailDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  modeRailEyebrow: {
    fontSize: 12,
  },
  modeRailHeader: {
    gap: 6,
  },
  pager: {
    flex: 1,
  },
  pane: {
    flex: 1,
  },
  paneScrollContent: {
    gap: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  promptCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promptList: {
    gap: 10,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 19,
  },
  promptsBlock: {
    gap: 10,
  },
  railContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  relatedPill: {
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  relatedPillText: {
    fontSize: 13,
  },
  relatedScrollContent: {
    paddingRight: 20,
  },
  screen: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 12,
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    marginLeft: 10,
    width: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  threadBlock: {
    gap: 10,
  },
  threadList: {
    gap: 24,
  },
});
