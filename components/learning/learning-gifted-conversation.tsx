import React from 'react';
import { Platform, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import { LearningComposer } from '@/components/learning/learning-composer';
import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';
import { LearningConversationScroll } from '@/components/learning/learning-conversation-scroll';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useConversationFocusAnchor } from '@/hooks/use-conversation-focus-anchor';
import type { LearningBridgeAction } from '@/lib/api/types';
import { resolveLatestTurnFocusMessageId } from '@/lib/learning/conversation-focus';
import type {
  LearningWorkspaceRenderedMessage,
  LearningWorkspaceStatusSignal,
} from '@/lib/learning/workspace';

type LearningGiftedConversationProps = {
  draft: string;
  emptyLabel: string;
  inputTestID?: string;
  isSending?: boolean;
  latestStatus?: LearningWorkspaceStatusSignal | null;
  messages: LearningWorkspaceRenderedMessage[];
  onAction?: (action: LearningBridgeAction) => void;
  onDraftChange: (value: string) => void;
  onSend: (value: string) => void;
  placeholder?: string;
  sendButtonTestID?: string;
  starterPrompts: string[];
  topPadding?: number;
};

function StarterPromptStrip({
  disabled,
  prompts,
  onPromptPress,
}: {
  disabled?: boolean;
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
            disabled={disabled}
            onPress={() => onPromptPress(prompt)}
            style={({ pressed }) => ({
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              opacity: disabled ? 0.48 : pressed ? 0.84 : 1,
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

function EmptyState({
  emptyLabel,
}: {
  emptyLabel: string;
}) {
  const { theme } = useAppTheme();

  return (
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
  );
}

function StatusAccessory({ latestStatus }: { latestStatus?: LearningWorkspaceStatusSignal | null }) {
  const { theme } = useAppTheme();

  if (!latestStatus?.label) {
    return null;
  }

  return (
    <View testID="learning-workspace-inline-status">
      <Text
        selectable
        style={{
          color: latestStatus.tone === 'warning' ? theme.colors.warning : theme.colors.textSoft,
          ...theme.typography.medium,
          fontSize: 12,
          lineHeight: 18,
        }}>
        {latestStatus.label}
      </Text>
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
  messages: LearningWorkspaceRenderedMessage[];
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
              <LearningConversationMessage message={message} onAction={onAction} />
            </View>
          ))
        ) : (
          <EmptyState emptyLabel={emptyLabel} />
        )}
      </View>
    </View>
  );
}

export function LearningGiftedConversation({
  draft,
  emptyLabel,
  inputTestID = 'learning-workspace-composer-input',
  isSending = false,
  latestStatus = null,
  messages,
  onAction,
  onDraftChange,
  onSend,
  placeholder = '继续发散，追问细节...',
  sendButtonTestID = 'learning-workspace-composer-send',
  starterPrompts,
  topPadding,
}: LearningGiftedConversationProps) {
  const { theme } = useAppTheme();
  const focusMessageId = React.useMemo(
    () => resolveLatestTurnFocusMessageId(messages),
    [messages]
  );
  const { focusAnchorY, setFocusAnchorY } = useConversationFocusAnchor(focusMessageId);

  const handleSend = React.useCallback(
    (value: string) => {
      const nextText = value.trim();
      if (!nextText || isSending) {
        return;
      }

      onSend(nextText);
    },
    [isSending, onSend]
  );

  return (
    <View
      style={{ backgroundColor: theme.colors.background, flex: 1 }}
      testID="learning-gifted-chat">
      <LearningConversationScroll
        contentContainerStyle={[
          {
            gap: 28,
            paddingBottom: 120,
            paddingHorizontal: 20,
            paddingTop: topPadding ?? 16,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        focusAnchorOffset={(topPadding ?? 0) + 24}
        focusAnchorY={focusAnchorY}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="learning-workspace-screen">
        <View style={{ gap: 28 }}>
          {messages.length === 0 ? (
            <StarterPromptStrip
              disabled={isSending}
              onPromptPress={handleSend}
              prompts={starterPrompts}
            />
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

      <View
        style={{
          backgroundColor: theme.colors.background,
          gap: 10,
          paddingBottom: Platform.OS === 'ios' ? 20 : 16,
          paddingHorizontal: 20,
          paddingTop: 12,
        }}>
        <StatusAccessory latestStatus={latestStatus} />
        <LearningComposer
          disabled={isSending}
          draft={draft}
          inputTestID={inputTestID}
          onChangeText={onDraftChange}
          onSend={() => {
            handleSend(draft);
          }}
          placeholder={placeholder}
          sendButtonTestID={sendButtonTestID}
          suggestions={[]}
        />
      </View>
    </View>
  );
}
