import { useExternalStoreRuntime } from '@assistant-ui/core/react';
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
} from '@assistant-ui/react-native';
import React from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

import { LearningChatBubble } from '@/components/learning/learning-chat-bubble';
import { LearningConversationMessage } from '@/components/learning/learning-conversation-message';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { LearningBridgeAction } from '@/lib/api/types';
import {
  getLearningMessageFromAssistantMessage,
  toAssistantLearningMessage,
} from '@/lib/learning/assistant-ui-conversation';
import type { LearningWorkspaceRenderedMessage } from '@/lib/learning/workspace';

type LearningAssistantConversationSectionProps = {
  emptyLabel: string;
  focusMessageId?: string | null;
  messages: LearningWorkspaceRenderedMessage[];
  onAction?: (action: LearningBridgeAction) => void;
  onFocusAnchorYChange?: (y: number | null) => void;
};

type LearningAssistantConversationContextValue = {
  focusMessageId?: string | null;
  onAction?: (action: LearningBridgeAction) => void;
  onFocusMessageLayout?: (event: LayoutChangeEvent) => void;
  onFocusMessageNodeChange?: (node: View | null) => void;
};

const LearningAssistantConversationContext =
  React.createContext<LearningAssistantConversationContextValue>({});

const LEARNING_ASSISTANT_MESSAGE_COMPONENTS = {
  AssistantMessage: LearningAssistantAssistantMessage,
  UserMessage: LearningAssistantUserMessage,
};

function EmptyState({ emptyLabel }: { emptyLabel: string }) {
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

function useLearningAssistantMessage() {
  const assistantMessage = useAuiState((state) => state.message);

  return React.useMemo(
    () => getLearningMessageFromAssistantMessage(assistantMessage),
    [assistantMessage]
  );
}

function LearningAssistantMessageRoot({ children }: { children: React.ReactNode }) {
  const { focusMessageId, onFocusMessageLayout, onFocusMessageNodeChange } = React.useContext(
    LearningAssistantConversationContext
  );
  const messageId = useAuiState((state) => state.message.id);
  const isFocusMessage = messageId === focusMessageId;
  const handleLayout = isFocusMessage ? onFocusMessageLayout : undefined;
  const handleNodeChange = React.useCallback(
    (node: View | null) => {
      if (!isFocusMessage) {
        return;
      }

      onFocusMessageNodeChange?.(node);
    },
    [isFocusMessage, onFocusMessageNodeChange]
  );

  return (
    <MessagePrimitive.Root
      style={{ width: '100%' }}
      testID={`learning-assistant-ui-message-${messageId}`}>
      <View
        collapsable={false}
        onLayout={handleLayout}
        ref={isFocusMessage ? handleNodeChange : undefined}
        style={{ width: '100%' }}>
        {children}
      </View>
    </MessagePrimitive.Root>
  );
}

function LearningAssistantUserMessage() {
  return (
    <LearningAssistantMessageRoot>
      <MessagePrimitive.Content
        renderText={({ part }) => <LearningChatBubble role="user" text={part.text} />}
      />
    </LearningAssistantMessageRoot>
  );
}

function LearningAssistantAssistantMessage() {
  const { onAction } = React.useContext(LearningAssistantConversationContext);
  const learningMessage = useLearningAssistantMessage();
  const hasTextPart = useAuiState((state) =>
    state.message.content.some((part) => part.type === 'text')
  );

  return (
    <LearningAssistantMessageRoot>
      {learningMessage ? (
        hasTextPart ? (
          <MessagePrimitive.Content
            renderReasoning={() => <React.Fragment />}
            renderText={() => (
              <LearningConversationMessage message={learningMessage} onAction={onAction} />
            )}
          />
        ) : (
          <LearningConversationMessage message={learningMessage} onAction={onAction} />
        )
      ) : (
        <MessagePrimitive.Content
          renderReasoning={({ part }) => (
            <LearningChatBubble role="assistant" text={part.text} />
          )}
          renderText={({ part }) => (
            <LearningChatBubble role="assistant" text={part.text} />
          )}
        />
      )}
    </LearningAssistantMessageRoot>
  );
}

function useLearningAssistantRuntime(messages: LearningWorkspaceRenderedMessage[]) {
  const isRunning = messages.at(-1)?.streaming === true;
  const handleNew = React.useCallback(async () => {}, []);

  return useExternalStoreRuntime(
    React.useMemo(
      () => ({
        convertMessage: toAssistantLearningMessage,
        isRunning,
        messages,
        onNew: handleNew,
        unstable_capabilities: {
          copy: false,
        },
      }),
      [handleNew, isRunning, messages]
    )
  );
}

export function LearningAssistantConversationSection({
  emptyLabel,
  focusMessageId,
  messages,
  onAction,
  onFocusAnchorYChange,
}: LearningAssistantConversationSectionProps) {
  const { theme } = useAppTheme();
  const runtime = useLearningAssistantRuntime(messages);
  const sectionContainerRef = React.useRef<View | null>(null);
  const focusMeasureFrameRef = React.useRef<number | null>(null);
  const focusMessageNodeRef = React.useRef<View | null>(null);
  const sectionYRef = React.useRef(0);

  const cancelPendingMeasure = React.useCallback(() => {
    if (focusMeasureFrameRef.current !== null) {
      cancelAnimationFrame(focusMeasureFrameRef.current);
      focusMeasureFrameRef.current = null;
    }
  }, []);

  const commitFocusAnchor = React.useCallback(() => {
    if (!onFocusAnchorYChange) {
      return;
    }

    const sectionNode = sectionContainerRef.current;
    const focusMessageNode = focusMessageNodeRef.current;

    if (!focusMessageId || !sectionNode || !focusMessageNode) {
      onFocusAnchorYChange(null);
      return;
    }

    focusMessageNode.measureLayout(
      sectionNode,
      (_left, top) => {
        onFocusAnchorYChange(sectionYRef.current + top);
      },
      () => {
        onFocusAnchorYChange(null);
      }
    );
  }, [focusMessageId, onFocusAnchorYChange]);

  const scheduleFocusMeasurement = React.useCallback(() => {
    cancelPendingMeasure();
    focusMeasureFrameRef.current = requestAnimationFrame(() => {
      focusMeasureFrameRef.current = null;
      commitFocusAnchor();
    });
  }, [cancelPendingMeasure, commitFocusAnchor]);

  const handleSectionLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      sectionYRef.current = event.nativeEvent.layout.y;
      scheduleFocusMeasurement();
    },
    [scheduleFocusMeasurement]
  );

  const handleFocusMessageLayout = React.useCallback(
    (_event: LayoutChangeEvent) => {
      scheduleFocusMeasurement();
    },
    [scheduleFocusMeasurement]
  );

  React.useEffect(() => {
    if (!focusMessageId) {
      onFocusAnchorYChange?.(null);
      return;
    }

    scheduleFocusMeasurement();

    return () => {
      cancelPendingMeasure();
    };
  }, [
    cancelPendingMeasure,
    focusMessageId,
    messages.length,
    onFocusAnchorYChange,
    scheduleFocusMeasurement,
  ]);

  const contextValue = React.useMemo(
    () => ({
      focusMessageId,
      onAction,
      onFocusMessageLayout: handleFocusMessageLayout,
      onFocusMessageNodeChange: (node: View | null) => {
        focusMessageNodeRef.current = node;
      },
    }),
    [focusMessageId, handleFocusMessageLayout, onAction]
  );

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <LearningAssistantConversationContext.Provider value={contextValue}>
        <View
          collapsable={false}
          onLayout={handleSectionLayout}
          ref={sectionContainerRef}>
          <ThreadPrimitive.Root style={{ gap: theme.spacing.lg }} testID="learning-assistant-ui-thread">
            <ThreadPrimitive.Empty>
              <EmptyState emptyLabel={emptyLabel} />
            </ThreadPrimitive.Empty>
            <ThreadPrimitive.Messages
              components={LEARNING_ASSISTANT_MESSAGE_COMPONENTS}
              contentContainerStyle={{ gap: 14 }}
              initialNumToRender={Math.max(messages.length, 10)}
              maxToRenderPerBatch={Math.max(messages.length, 10)}
              scrollEnabled={false}
              testID="learning-assistant-ui-messages"
            />
          </ThreadPrimitive.Root>
        </View>
      </LearningAssistantConversationContext.Provider>
    </AssistantRuntimeProvider>
  );
}
