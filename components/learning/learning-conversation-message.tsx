import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { AppIcon } from '@/components/base/app-icon';
import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { LearningMarkdownBody } from '@/components/learning/learning-markdown-body';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { LearningBridgeAction, LearningCitation } from '@/lib/api/types';
import type {
  LearningWorkspaceMessageCard,
  LearningWorkspaceRenderedMessage,
} from '@/lib/learning/workspace';

type LearningContentCard = Extract<LearningWorkspaceMessageCard, { content: string }>;
type LearningActionCard = Extract<LearningWorkspaceMessageCard, { actions: LearningBridgeAction[] }>;
type LearningStringListCard = Extract<LearningWorkspaceMessageCard, { items: string[] }>;
type LearningEvidenceCard = Extract<LearningWorkspaceMessageCard, { items: LearningCitation[] }>;
type LearningExaminerCard = Extract<LearningWorkspaceMessageCard, { kind: 'examiner' }>;

function isContentCardKind<TKind extends LearningContentCard['kind']>(
  card: LearningWorkspaceMessageCard,
  kind: TKind
): card is LearningContentCard & { kind: TKind } {
  return card.kind === kind && 'content' in card;
}

function isStringListCardKind<TKind extends LearningStringListCard['kind']>(
  card: LearningWorkspaceMessageCard,
  kind: TKind
): card is LearningStringListCard & { kind: TKind } {
  return card.kind === kind && 'items' in card;
}

function isActionCardKind<TKind extends LearningActionCard['kind']>(
  card: LearningWorkspaceMessageCard,
  kind: TKind
): card is LearningActionCard & { kind: TKind } {
  return card.kind === kind && 'actions' in card;
}

function isEvidenceCard(card: LearningWorkspaceMessageCard): card is LearningEvidenceCard {
  return card.kind === 'evidence' && 'items' in card;
}

function isExaminerCard(card: LearningWorkspaceMessageCard): card is LearningExaminerCard {
  return card.kind === 'examiner' && 'evaluation' in card;
}

function TextSection({
  content,
  streaming = false,
  tone = 'primary',
}: {
  content: string;
  streaming?: boolean;
  tone?: 'muted' | 'primary';
}) {
  return (
    <View style={{ gap: 10 }}>
      <LearningMarkdownBody
        content={content}
        streaming={streaming}
        tone={tone}
      />
    </View>
  );
}

function SectionShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        gap: 12,
        padding: 16,
      }}>
      <Text
        selectable
        style={{
          color: theme.colors.textSoft,
          ...theme.typography.semiBold,
          fontSize: 12,
          letterSpacing: 0.3,
        }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function EvidenceSection({
  items,
}: {
  items: LearningCitation[];
}) {
  const { theme } = useAppTheme();

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionShell title="资料依据">
      <View style={{ gap: 12 }}>
        {items.map((item, index) => (
          <View key={`${item.chunkId ?? 'citation'}-${index}`} style={{ gap: 6 }}>
            {item.sourceTitle ? (
              <Text
                selectable
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 13,
                }}>
                {item.sourceTitle}
              </Text>
            ) : null}
            {item.excerpt ? (
              <LearningMarkdownBody
                content={item.excerpt}
                tone="muted"
              />
            ) : null}
          </View>
        ))}
      </View>
    </SectionShell>
  );
}

function ListSection({
  items,
  title,
}: {
  items: string[];
  title: string;
}) {
  const { theme } = useAppTheme();

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionShell title={title}>
      <View style={{ gap: 10 }}>
        {items.map((item) => (
          <View
            key={item}
            style={{
              alignItems: 'flex-start',
              flexDirection: 'row',
              gap: 10,
            }}>
            <View
              style={{
                backgroundColor: theme.colors.primaryStrong,
                borderRadius: theme.radii.pill,
                height: 6,
                marginTop: 8,
                width: 6,
              }}
            />
            <LearningMarkdownBody
              content={item}
              tone="muted"
            />
          </View>
        ))}
      </View>
    </SectionShell>
  );
}

function EvaluationSection({
  evaluation,
}: {
  evaluation: Extract<LearningWorkspaceMessageCard, { kind: 'examiner' }>['evaluation'];
}) {
  const { theme } = useAppTheme();

  return (
    <SectionShell title="考官判断">
      <View style={{ gap: 10 }}>
        <Text
          selectable
          style={{
            color: evaluation.passed ? theme.colors.primaryStrong : theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 14,
          }}>
          {evaluation.passed ? '这一轮已经达到当前步骤要求。' : '这一轮还需要继续打磨。'}
        </Text>
        {evaluation.reasoning ? (
          <LearningMarkdownBody
            content={evaluation.reasoning}
            tone="muted"
          />
        ) : null}
        {evaluation.missingConcepts.length > 0 ? (
          <Text
            selectable
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 13,
              lineHeight: 20,
            }}>
            {`待补概念：${evaluation.missingConcepts.join('、')}`}
          </Text>
        ) : null}
      </View>
    </SectionShell>
  );
}

function ActionSection({
  actions,
  onAction,
  title,
}: {
  actions: LearningBridgeAction[];
  onAction?: (action: LearningBridgeAction) => void;
  title: string;
}) {
  const { theme } = useAppTheme();

  if (actions.length === 0) {
    return null;
  }

  return (
    <SectionShell title={title}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {actions.map((action, index) => (
          <Pressable
            key={`${action.actionType}-${index}`}
            accessibilityRole="button"
            onPress={() => onAction?.(action)}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.surfaceTint,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              opacity: pressed ? 0.84 : 1,
              paddingHorizontal: 14,
              paddingVertical: 10,
            })}>
            <Text
              selectable
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.semiBold,
                fontSize: 13,
              }}>
              {action.label ?? action.actionType}
            </Text>
          </Pressable>
        ))}
      </View>
    </SectionShell>
  );
}

function ReasoningSection({
  content,
}: {
  content: string;
}) {
  const { theme } = useAppTheme();
  const paragraphs = content
    .split(/\n\s*\n/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <View style={{ gap: 12, paddingTop: 4 }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 8,
        }}>
        <AppIcon color={theme.colors.textSoft} name="search" size={14} strokeWidth={1.8} />
        <Text
          selectable
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.medium,
            fontSize: 13,
            lineHeight: 18,
          }}>
          基于当前资料推理
        </Text>
      </View>
      <View
        style={{
          minHeight: 24,
          paddingLeft: 22,
          position: 'relative',
        }}>
        <View
          style={{
            backgroundColor: theme.colors.borderSoft,
            bottom: 0,
            left: 8,
            position: 'absolute',
            top: 0,
            width: 1,
          }}
        />
        <View
          style={{
            backgroundColor: theme.colors.textSoft,
            borderRadius: 4,
            height: 8,
            left: 4.5,
            position: 'absolute',
            top: 6,
            width: 8,
          }}
        />
        <View style={{ gap: 18 }}>
          {(paragraphs.length > 0 ? paragraphs : [content]).map((paragraph, index) => (
            <Text
              key={`reasoning-${index}`}
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 15,
                lineHeight: 28,
              }}>
              {paragraph}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function ExploreMessage({
  message,
  onAction,
}: {
  message: LearningWorkspaceRenderedMessage;
  onAction?: (action: LearningBridgeAction) => void;
}) {
  const { theme } = useAppTheme();
  const [exploreReasoningExpanded, setExploreReasoningExpanded] = React.useState(false);
  const presentation = message.presentation?.kind === 'explore' ? message.presentation : null;
  const answerContent = presentation?.answer.content.trim() ?? '';
  const exploreReasoning = presentation?.reasoningContent?.trim() ?? '';
  const showThinkingOnly = message.streaming && !answerContent && !exploreReasoning;

  const handleToggle = React.useCallback(() => {
    if (!exploreReasoning) return;
    setExploreReasoningExpanded((v) => !v);
  }, [exploreReasoning]);

  if (!presentation) return null;
  if (showThinkingOnly) return <LearningChatBubble role="assistant" text="" thinking />;

  return (
    <View style={{ gap: 16, width: '100%' }}>
      <View style={{ gap: 10 }}>
        {/* Header row: label + chevron + streaming status */}
        <Pressable
          accessibilityRole={exploreReasoning ? 'button' : undefined}
          disabled={!exploreReasoning}
          onPress={handleToggle}
          style={({ pressed }) => ({
            opacity: pressed && exploreReasoning ? 0.8 : 1,
          })}
          testID={exploreReasoning ? 'learning-conversation-reasoning-toggle' : undefined}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 6 }}>
            <Text
              selectable
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.semiBold,
                fontSize: 13,
                letterSpacing: 0.2,
              }}>
              Explore
            </Text>
            {exploreReasoning ? (
              <View
                style={{
                  transform: [{ rotate: exploreReasoningExpanded ? '180deg' : '0deg' }],
                }}>
                <AppIcon color={theme.colors.textSoft} name="chevronDown" size={15} strokeWidth={2} />
              </View>
            ) : null}
            {message.streaming ? (
              <Text
                selectable
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                正在整理这轮回复…
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Reasoning body — conditionally mounted, enters with fade+slide */}
        {exploreReasoningExpanded && exploreReasoning ? (
          <Animated.View
            entering={FadeInDown.duration(320).springify().damping(20).stiffness(140)}
            exiting={FadeOutUp.duration(200)}>
            <View
              style={{
                borderBottomColor: theme.colors.borderSoft,
                borderBottomWidth: 1,
                paddingBottom: 14,
              }}>
              <ReasoningSection content={exploreReasoning} />
            </View>
          </Animated.View>
        ) : null}
      </View>

      {answerContent || message.streaming ? (
        <TextSection content={answerContent} streaming={message.streaming} />
      ) : null}
    </View>
  );
}

function GuideMessage({
  message,
  onAction,
}: {
  message: LearningWorkspaceRenderedMessage;
  onAction?: (action: LearningBridgeAction) => void;
}) {
  const { theme } = useAppTheme();
  const primaryCard =
    message.cards.find((card) => isContentCardKind(card, 'coach')) ??
    message.cards.find((card) => isContentCardKind(card, 'teacher')) ??
    null;
  const teacherCard = message.cards.find((card) => isContentCardKind(card, 'teacher'));
  const peerCard = message.cards.find((card) => isContentCardKind(card, 'peer'));
  const examinerCard = message.cards.find(isExaminerCard);
  const evidenceCard = message.cards.find(isEvidenceCard);
  const remediationCard = message.cards.find((card) => isStringListCardKind(card, 'remediation'));
  const followupsCard = message.cards.find((card) => isStringListCardKind(card, 'followups'));
  const relatedConceptsCard = message.cards.find((card) =>
    isStringListCardKind(card, 'related_concepts')
  );
  const redirectCard = message.cards.find((card) => isActionCardKind(card, 'redirect'));
  const primaryContent = primaryCard?.content ?? message.text.trim();

  if (message.streaming && !primaryContent) {
    return <LearningChatBubble role="assistant" text="" thinking />;
  }

  return (
    <View style={{ gap: 12, width: '100%' }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 8,
        }}>
        <View
          style={{
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}>
          <Text
            selectable
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.semiBold,
              fontSize: 11,
              letterSpacing: 0.5,
            }}>
            Guide
          </Text>
        </View>
        {message.streaming ? (
          <Text
            selectable
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            正在整理这轮回复…
          </Text>
        ) : null}
      </View>
      {primaryContent ? <TextSection content={primaryContent} /> : null}
      {teacherCard && teacherCard.content.trim() && teacherCard.content !== primaryContent ? (
        <SectionShell title="导师主讲">
          <TextSection content={teacherCard.content} tone="muted" />
        </SectionShell>
      ) : null}
      {peerCard?.content ? (
        <SectionShell title="学伴追问">
          <TextSection content={peerCard.content} tone="muted" />
        </SectionShell>
      ) : null}
      {examinerCard ? <EvaluationSection evaluation={examinerCard.evaluation} /> : null}
      <EvidenceSection items={evidenceCard?.items ?? []} />
      <ListSection
        items={remediationCard?.items ?? followupsCard?.items ?? []}
        title={remediationCard ? '补强建议' : '继续推进'}
      />
      <ListSection items={relatedConceptsCard?.items ?? []} title="相关概念" />
      <ActionSection actions={redirectCard?.actions ?? []} onAction={onAction} title="转向 Explore" />
    </View>
  );
}

export function LearningConversationMessage({
  message,
  onAction,
}: {
  message: LearningWorkspaceRenderedMessage;
  onAction?: (action: LearningBridgeAction) => void;
}) {
  if (message.role === 'user') {
    return <LearningChatBubble role="user" text={message.text} />;
  }

  if (message.presentation?.kind === 'explore') {
    return <ExploreMessage message={message} onAction={onAction} />;
  }

  if (!message.presentation || message.cards.length === 0) {
    if (message.streaming && !message.text.trim()) {
      return <LearningChatBubble role="assistant" text="" thinking />;
    }

    return (
      <LearningChatBubble
        role="assistant"
        streaming={message.streaming}
        text={message.text}
        thinkingLabel={message.streaming ? '整理中' : undefined}
      />
    );
  }

  return <GuideMessage message={message} onAction={onAction} />;
}
