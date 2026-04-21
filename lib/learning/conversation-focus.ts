import type { LearningWorkspaceRenderedMessage } from '@/lib/learning/workspace';

export function resolveLatestTurnFocusMessageId(
  messages: LearningWorkspaceRenderedMessage[]
): string | null {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return null;
  }

  // When the user just sent a message (it's the last one, awaiting response),
  // anchor to it so the scroll positions it in the upper viewport area.
  if (lastMessage.role === 'user') {
    return lastMessage.id;
  }

  // When the assistant is actively streaming, anchor to the preceding user
  // message so it stays pinned in the upper viewport area.
  if (lastMessage.role === 'assistant' && lastMessage.streaming) {
    for (let index = messages.length - 2; index >= 0; index -= 1) {
      if (messages[index]?.role === 'user') {
        return messages[index]?.id ?? null;
      }
    }

    return lastMessage.id;
  }

  return null;
}
