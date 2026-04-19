import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { LearningBridgeAction } from '@/lib/api/types';
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
      <Text
        selectable
        style={{
          color: theme.colors.text,
          fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
          fontSize: isPrimary ? 17 : 16,
          lineHeight: isPrimary ? 28 : 26,
        }}>
        {content}
      </Text>
    </View>
  );
}

function ExploreMessage({
  presentation,
  streaming,
}: {
  presentation: NonNullable<LearningWorkspaceRenderedMessage['presentation']>;
  streaming: boolean;
}) {
  const { theme } = useAppTheme();
  const [exploreReasoningExpanded, setExploreReasoningExpanded] = React.useState(false);
  const answerContent = presentation.kind === 'explore' ? presentation.answer.content.trim() : '';
  const exploreReasoning =
    presentation.kind === 'explore' ? presentation.reasoningContent?.trim() ?? '' : '';
  const showThinkingOnly = streaming && !answerContent && !exploreReasoning;

  if (showThinkingOnly) {
    return <LearningChatBubble role="assistant" text="" thinking />;
  }

  return (
    <View style={{ gap: 16, width: '100%' }}>
      <View
        style={{
          gap: 10,
        }}>
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
            {streaming ? (
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
      {answerContent || streaming ? <TextSection content={answerContent} /> : null}
    </View>
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

function renderCard(
  card: LearningWorkspaceMessageCard,
) {
  switch (card.kind) {
    case 'coach':
    case 'answer':
      return <TextSection key={`${card.kind}-${card.title}`} content={card.content} />;
    case 'teacher':
    case 'peer':
      return (
        <TextSection
          key={`${card.kind}-${card.title}`}
          content={card.content}
          tone="muted"
        />
      );
    case 'examiner':
    case 'evidence':
    case 'remediation':
    case 'followups':
    case 'related_concepts':
    case 'redirect':
    case 'bridge_actions':
      return null;
    default:
      return null;
  }
}

export function LearningConversationMessage({
  message,
  onAction,
}: {
  message: LearningWorkspaceRenderedMessage;
  onAction?: (action: LearningBridgeAction) => void;
}) {
  const { theme } = useAppTheme();
  const isExploreMessage = message.presentation?.kind === 'explore';

  if (message.role === 'user') {
    return <LearningChatBubble role="user" text={message.text} />;
  }

  if (isExploreMessage && message.presentation) {
    return <ExploreMessage presentation={message.presentation} streaming={message.streaming} />;
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
      {!isExploreMessage ? (
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
      ) : null}
      <View style={{ gap: 16 }}>
        {message.cards.map((card) => renderCard(card))}
      </View>
    </View>
  );
}
