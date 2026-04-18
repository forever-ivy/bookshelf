import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { GlassSurface } from '@/components/base/glass-surface';
import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { LearningBridgeAction } from '@/lib/api/types';
import type {
  LearningWorkspaceMessageCard,
  LearningWorkspaceRenderedMessage,
} from '@/lib/learning/workspace';

function SectionCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  const { theme } = useAppTheme();

  return (
    <GlassSurface
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 24,
        padding: 16,
      }}>
      <View style={{ gap: 12 }}>
        <Text
          selectable
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.semiBold,
            fontSize: 12,
            textTransform: 'uppercase',
          }}>
          {title}
        </Text>
        {children}
      </View>
    </GlassSurface>
  );
}

function EvidenceCard({ card }: { card: Extract<LearningWorkspaceMessageCard, { kind: 'evidence' }> }) {
  const { theme } = useAppTheme();

  return (
    <SectionCard title={card.title}>
      <View style={{ gap: 10 }}>
        {card.items.map((item, index) => (
          <View
            key={`${item.chunkId ?? index}-${item.sourceTitle ?? 'citation'}`}
            style={{
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.borderSoft,
              borderRadius: 18,
              borderWidth: 1,
              gap: 8,
              padding: 12,
            }}>
            {item.sourceTitle ? (
              <Text
                selectable
                style={{
                  color: theme.colors.primaryStrong,
                  ...theme.typography.semiBold,
                  fontSize: 12,
                }}>
                {item.sourceTitle}
              </Text>
            ) : null}
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              {item.excerpt ?? '已命中当前资料片段。'}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

function PillListCard({
  card,
}: {
  card: Extract<
    LearningWorkspaceMessageCard,
    { kind: 'followups' | 'related_concepts' | 'remediation' }
  >;
}) {
  const { theme } = useAppTheme();

  return (
    <SectionCard title={card.title}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {card.items.map((item) => (
          <View
            key={item}
            style={{
              backgroundColor: theme.colors.surfaceMuted,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}>
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 13,
              }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </SectionCard>
  );
}

function BridgeActionsCard({
  card,
  onAction,
}: {
  card: Extract<LearningWorkspaceMessageCard, { kind: 'bridge_actions' | 'redirect' }>;
  onAction?: (action: LearningBridgeAction) => void;
}) {
  const { theme } = useAppTheme();

  return (
    <SectionCard title={card.title}>
      <View style={{ gap: 10 }}>
        {card.actions.map((action) => (
          <Pressable
            key={`${action.actionType}-${action.label ?? 'action'}`}
            accessibilityRole="button"
            onPress={() => onAction?.(action)}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.primarySoft,
              borderColor: theme.colors.borderSoft,
              borderRadius: 18,
              borderWidth: 1,
              gap: 6,
              opacity: pressed ? 0.76 : 1,
              padding: 14,
            })}>
            <Text
              selectable
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              {action.label ?? action.actionType}
            </Text>
            {action.description ? (
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                  lineHeight: 19,
                }}>
                {action.description}
              </Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </SectionCard>
  );
}

function renderCard(
  card: LearningWorkspaceMessageCard,
  onAction?: (action: LearningBridgeAction) => void
) {
  switch (card.kind) {
    case 'coach':
    case 'teacher':
    case 'peer':
    case 'answer':
      return (
        <SectionCard key={`${card.kind}-${card.title}`} title={card.title}>
          <LearningChatBubble role="assistant" text={card.content} />
        </SectionCard>
      );
    case 'examiner': {
      const { passed, reasoning, missingConcepts } = card.evaluation;
      return (
        <SectionCard key={`${card.kind}-${card.title}`} title={card.title}>
          <ExaminerCardBody
            missingConcepts={missingConcepts}
            passed={passed}
            reasoning={reasoning}
          />
        </SectionCard>
      );
    }
    case 'evidence':
      return <EvidenceCard key={`${card.kind}-${card.title}`} card={card} />;
    case 'remediation':
    case 'followups':
    case 'related_concepts':
      return <PillListCard key={`${card.kind}-${card.title}`} card={card} />;
    case 'redirect':
    case 'bridge_actions':
      return (
        <BridgeActionsCard
          key={`${card.kind}-${card.title}`}
          card={card}
          onAction={onAction}
        />
      );
    default:
      return null;
  }
}

function ExaminerCardBody({
  missingConcepts,
  passed,
  reasoning,
}: {
  missingConcepts: string[];
  passed: boolean;
  reasoning?: string | null;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: passed ? theme.colors.availabilityReadySoft : theme.colors.warningSoft,
        borderColor: passed ? theme.colors.availabilityReady : theme.colors.warning,
        borderRadius: 18,
        borderWidth: 1,
        gap: 8,
        padding: 14,
      }}>
      <Text
        selectable
        style={{
          color: passed ? theme.colors.success : theme.colors.warning,
          ...theme.typography.semiBold,
          fontSize: 14,
        }}>
        {passed ? '已经通过当前步骤' : '还需要补强'}
      </Text>
      {reasoning ? (
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          {reasoning}
        </Text>
      ) : null}
      {!passed && missingConcepts.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {missingConcepts.map((concept) => (
            <View
              key={concept}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.pill,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}>
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                {concept}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
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
  const { theme } = useAppTheme();

  if (message.role === 'user') {
    return <LearningChatBubble role="user" text={message.text} />;
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
            borderRadius: theme.radii.pill,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}>
          <Text
            selectable
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.semiBold,
              fontSize: 12,
            }}>
            {message.presentation.kind === 'guide' ? 'Guide' : 'Explore'}
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
      <View style={{ gap: 12 }}>
        {message.cards.map((card) => renderCard(card, onAction))}
      </View>
    </View>
  );
}
