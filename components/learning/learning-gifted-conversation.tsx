import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { LearningAssistantConversationSection } from '@/components/learning/learning-assistant-conversation';
import { LearningComposer } from '@/components/learning/learning-composer';
import { LearningConversationScroll } from '@/components/learning/learning-conversation-scroll';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useConversationFocusAnchor } from '@/hooks/use-conversation-focus-anchor';
import type { LearningBridgeAction } from '@/lib/api/types';
import { resolveLatestTurnFocusMessageId } from '@/lib/learning/conversation-focus';
import type { LearningWorkspaceRenderedMessage, LearningWorkspaceStatusSignal } from '@/lib/learning/workspace';

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

export function LearningGiftedConversation({
  draft,
  emptyLabel,
  inputTestID = 'learning-workspace-composer-input',
  isSending = false,
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
        focusAnchorOffset={Math.max(0, (topPadding ?? 0) - 16)}
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
          <LearningAssistantConversationSection
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
          paddingBottom: Platform.OS === 'ios' ? 20 : 16,
          paddingHorizontal: 20,
          paddingTop: 12,
        }}>
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
