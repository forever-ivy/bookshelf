import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { LearningRichText } from '@/components/learning/learning-rich-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { LearningBridgeAction, LearningCitation } from '@/lib/api/types';
import type {
  LearningWorkspaceMessageCard,
  LearningWorkspaceRenderedMessage,
} from '@/lib/learning/workspace';

function TextSection({
  content,
  tone = 'primary',
}: {
  content: string;
  tone?: 'muted' | 'primary';
}) {
  const { theme } = useAppTheme();
  const isPrimary = tone === 'primary';

  return (
    <View style={{ gap: 10 }}>
      <LearningRichText
        content={content}
        style={{
          color: theme.colors.text,
          fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
          fontSize: isPrimary ? 17 : 16,
          lineHeight: isPrimary ? 28 : 26,
        }}
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
              <LearningRichText
                content={item.excerpt}
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 22,
                }}
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
            <LearningRichText
              content={item}
              style={{
                color: theme.colors.text,
                flex: 1,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 22,
              }}
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
          <LearningRichText
            content={evaluation.reasoning}
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 22,
            }}
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

  if (!presentation) {
    return null;
  }

  if (showThinkingOnly) {
    return <LearningChatBubble role="assistant" text="" thinking />;
  }

  return (
    <View style={{ gap: 16, width: '100%' }}>
      <View style={{ gap: 10 }}>
        <Pressable
          accessibilityRole={exploreReasoning ? 'button' : undefined}
          disabled={!exploreReasoning}
          onPress={() => {
            if (!exploreReasoning) {
              return;
            }
            setExploreReasoningExpanded((value) => !value);
          }}
          style={({ pressed }) => ({
            opacity: pressed && exploreReasoning ? 0.88 : 1,
          })}
          testID={exploreReasoning ? 'learning-conversation-reasoning-toggle' : undefined}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 6,
            }}>
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
        {exploreReasoningExpanded ? (
          <View
            style={{
              borderBottomColor: theme.colors.borderSoft,
              borderBottomWidth: 1,
              paddingBottom: 14,
            }}>
            <ReasoningSection content={exploreReasoning} />
          </View>
        ) : null}
      </View>
      {answerContent || message.streaming ? <TextSection content={answerContent} /> : null}
      <ActionSection actions={presentation.bridgeActions} onAction={onAction} title="收编动作" />
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
    message.cards.find((card) => card.kind === 'coach') ??
    message.cards.find((card) => card.kind === 'teacher') ??
    null;
  const teacherCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'teacher' }> =>
      card.kind === 'teacher'
  );
  const peerCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'peer' }> => card.kind === 'peer'
  );
  const examinerCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'examiner' }> =>
      card.kind === 'examiner'
  );
  const evidenceCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'evidence' }> =>
      card.kind === 'evidence'
  );
  const remediationCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'remediation' }> =>
      card.kind === 'remediation'
  );
  const followupsCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'followups' }> =>
      card.kind === 'followups'
  );
  const relatedConceptsCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'related_concepts' }> =>
      card.kind === 'related_concepts'
  );
  const redirectCard = message.cards.find(
    (card): card is Extract<LearningWorkspaceMessageCard, { kind: 'redirect' }> =>
      card.kind === 'redirect'
  );
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
