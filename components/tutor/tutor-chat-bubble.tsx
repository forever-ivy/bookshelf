import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Copy, Ellipsis, RefreshCcw, Share, type LucideIcon } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type MarkdownBlock =
  | { content: string; type: 'heading' | 'paragraph' | 'quote' }
  | { items: string[]; type: 'list' };

function parseMarkdown(text: string) {
  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    blocks.push({
      content: paragraphBuffer.join('\n'),
      type: 'paragraph',
    });
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) {
      return;
    }

    blocks.push({
      items: [...listBuffer],
      type: 'list',
    });
    listBuffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push({
        content: trimmed.replace(/^#{1,6}\s+/, '').trim(),
        type: 'heading',
      });
      return;
    }

    if (trimmed.startsWith('- ')) {
      flushParagraph();
      listBuffer.push(trimmed.slice(2).trim());
      return;
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph();
      flushList();
      blocks.push({
        content: trimmed.slice(2).trim(),
        type: 'quote',
      });
      return;
    }

    paragraphBuffer.push(trimmed);
  });

  flushParagraph();
  flushList();

  return blocks;
}

function ThinkingDots() {
  const { theme } = useAppTheme();
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % 3);
    }, 260);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 8,
      }}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={{
            backgroundColor: theme.colors.textSoft,
            borderRadius: theme.radii.pill,
            height: 8,
            opacity: activeIndex === index ? 1 : 0.28,
            transform: [{ scale: activeIndex === index ? 1.05 : 0.92 }],
            width: 8,
          }}
        />
      ))}
    </View>
  );
}

function AssistantAction({
  accessibilityLabel,
  icon: Icon,
}: {
  accessibilityLabel: string;
  icon: LucideIcon;
}) {
  const { theme } = useAppTheme();
  const ActionIcon = Icon as React.ComponentType<any>;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={() => {}}
      style={({ pressed }) => ({
        opacity: pressed ? 0.72 : 1,
        paddingVertical: 4,
      })}>
      <ActionIcon color={theme.colors.iconInk} size={21} strokeWidth={1.8} />
    </Pressable>
  );
}

export function TutorChatBubble({
  role,
  streaming = false,
  text,
  thinking = false,
  thinkingLabel,
}: {
  role: 'assistant' | 'user';
  streaming?: boolean;
  text: string;
  thinking?: boolean;
  thinkingLabel?: string;
}) {
  const { theme } = useAppTheme();
  const isAssistant = role === 'assistant';
  const assistantBlocks = React.useMemo(() => {
    if (!isAssistant || thinking) {
      return [];
    }

    const source = `${text}${streaming ? '▌' : ''}`;
    return parseMarkdown(source);
  }, [isAssistant, streaming, text, thinking]);

  if (isAssistant && thinking) {
    return (
      <View style={{ alignItems: 'flex-start', width: '100%' }}>
        <View
          testID="tutor-assistant-thinking-indicator"
          style={{
            gap: 8,
            paddingVertical: 8,
          }}>
          <ThinkingDots />
        </View>
      </View>
    );
  }

  if (isAssistant) {
    return (
      <View style={{ alignItems: 'flex-start', width: '100%' }}>
        <View
          style={{
            maxWidth: '100%',
            paddingRight: theme.spacing.lg,
          }}>
          {thinkingLabel ? (
            <Text
              selectable
              testID="tutor-assistant-thinking-label"
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.medium,
                fontSize: 13,
                marginBottom: 20,
              }}>
              {thinkingLabel}
            </Text>
          ) : null}

          <View style={{ gap: 24 }}>
            {assistantBlocks.map((block, index) => {
              if (block.type === 'heading') {
                return (
                  <Text
                    key={`heading-${index}`}
                    selectable
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.heading,
                      fontSize: 18,
                      lineHeight: 24,
                    }}>
                    {block.content}
                  </Text>
                );
              }

              if (block.type === 'quote') {
                return (
                  <View
                    key={`quote-${index}`}
                    style={{
                      borderLeftColor: theme.colors.primaryStrong,
                      borderLeftWidth: 3,
                      paddingLeft: 12,
                    }}>
                    <Text
                      selectable
                      style={{
                        color: theme.colors.textMuted,
                        ...theme.typography.body,
                        fontSize: 15,
                        lineHeight: 25,
                      }}>
                      {block.content}
                    </Text>
                  </View>
                );
              }

              if (block.type === 'list') {
                return (
                  <View key={`list-${index}`} style={{ gap: theme.spacing.sm }}>
                    {block.items.map((item) => (
                      <View
                        key={item}
                        style={{
                          alignItems: 'flex-start',
                          flexDirection: 'row',
                          gap: theme.spacing.sm,
                        }}>
                        <View
                          style={{
                            backgroundColor: theme.colors.primaryStrong,
                            borderRadius: theme.radii.pill,
                            height: 6,
                            marginTop: 11,
                            width: 6,
                          }}
                        />
                        <Text
                          selectable
                          style={{
                            color: theme.colors.text,
                            ...theme.typography.body,
                            flex: 1,
                            fontSize: 17,
                            lineHeight: 29,
                          }}>
                          {item}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              }

              return (
                <Text
                  key={`paragraph-${index}`}
                  selectable
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.body,
                    fontSize: 17,
                    lineHeight: 29,
                  }}>
                  {block.content}
                </Text>
              );
            })}
          </View>

          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 18,
              marginTop: 18,
            }}>
            <AssistantAction accessibilityLabel="复制回答" icon={Copy} />
            <AssistantAction accessibilityLabel="重试回答" icon={RefreshCcw} />
            <AssistantAction accessibilityLabel="分享回答" icon={Share} />
            <AssistantAction accessibilityLabel="更多操作" icon={Ellipsis} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        alignItems: 'flex-end',
      }}>
      <View
        style={{
          backgroundColor: theme.colors.knowledgeSoft,
          borderColor: theme.colors.borderSoft,
          borderRadius: 28,
          borderWidth: 1,
          maxWidth: '84%',
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: 14,
        }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.body,
            fontSize: 15,
            lineHeight: 23,
          }}>
          {text}
          {streaming ? '▌' : ''}
        </Text>
      </View>
    </View>
  );
}
