import React from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';
import { Copy, Ellipsis, RefreshCcw, Share, type LucideIcon } from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import {
  LearningRichText,
  learningTextNeedsRichRendering,
} from '@/components/learning/learning-rich-text';

type MarkdownBlock =
  | { content: string; type: 'heading' | 'paragraph' | 'quote' }
  | { items: string[]; type: 'list' };

function resolveConversationBodyTypography() {
  return {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: 17,
    lineHeight: 28,
  };
}

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

function ChatGPTCursor({ inline = false }: { inline?: boolean }) {
  const { theme } = useAppTheme();
  const opacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: !inline,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: !inline,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, inline]);

  if (inline) {
    return <Animated.Text style={{ opacity }}>●</Animated.Text>;
  }

  return (
    <Animated.View
      style={{
        backgroundColor: theme.colors.text,
        borderRadius: 99,
        height: 14,
        opacity,
        width: 14,
      }}
    />
  );
}

function ThinkingPulse() {
  const { theme } = useAppTheme();
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.04,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.72,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: theme.colors.primarySoft,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        opacity,
        paddingHorizontal: 14,
        paddingVertical: 8,
        transform: [{ scale }],
      }}>
      <Text
        selectable
        style={{
          color: theme.colors.primaryStrong,
          ...theme.typography.semiBold,
          fontSize: 15,
        }}>
        Thinking
      </Text>
    </Animated.View>
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

export function LearningChatBubble({
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
  const needsRichUserRendering = !isAssistant && learningTextNeedsRichRendering(text);
  const bodyTypography = resolveConversationBodyTypography();
  const userTextStyle = {
    color: theme.colors.text,
    ...bodyTypography,
    ...(needsRichUserRendering ? { flex: 1 } : null),
  };
  const assistantBlocks = React.useMemo(() => {
    if (!isAssistant || thinking) {
      return [];
    }

    const source = `${text}`;
    return parseMarkdown(source);
  }, [isAssistant, text, thinking]);

  if (isAssistant && thinking) {
    return (
      <View style={{ alignItems: 'flex-start', width: '100%' }}>
        <View
          testID="learning-assistant-thinking-indicator"
          style={{
            gap: 8,
            paddingVertical: 8,
          }}>
          <ThinkingPulse />
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
              testID="learning-assistant-thinking-label"
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
            {assistantBlocks.length === 0 && streaming && !thinking ? (
               <Text
                selectable
                style={{
                  color: theme.colors.text,
                  ...bodyTypography,
                }}>
                <ChatGPTCursor inline />
              </Text>
            ) : null}
            {assistantBlocks.map((block, index) => {
              const isLastBlock = streaming && index === assistantBlocks.length - 1;

              if (block.type === 'heading') {
                return (
                  <View key={`heading-${index}`}>
                    <LearningRichText 
                      content={block.content}
                      style={{
                        color: theme.colors.text,
                        fontFamily: bodyTypography.fontFamily,
                        fontSize: 19,
                        fontWeight: '600',
                        lineHeight: 26,
                      }}
                    />
                    {isLastBlock ? <ChatGPTCursor inline /> : null}
                  </View>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <LearningRichText 
                        content={block.content}
                        style={{
                          color: theme.colors.textMuted,
                          fontFamily: bodyTypography.fontFamily,
                          fontSize: 16,
                          lineHeight: 26,
                          flex: 1,
                        }}
                      />
                      {isLastBlock ? <ChatGPTCursor inline /> : null}
                    </View>
                  </View>
                );
              }

              if (block.type === 'list') {
                return (
                  <View key={`list-${index}`} style={{ gap: theme.spacing.sm }}>
                    {block.items.map((item, itemIndex) => {
                      const isLastItem = isLastBlock && itemIndex === block.items.length - 1;
                      return (
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
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <LearningRichText 
                              content={item}
                              style={{
                                color: theme.colors.text,
                                flex: 1,
                                ...bodyTypography,
                              }}
                            />
                            {isLastItem ? <ChatGPTCursor inline /> : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              }

              return (
                <View key={`paragraph-${index}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <LearningRichText 
                    content={block.content}
                    style={{
                      color: theme.colors.text,
                      ...bodyTypography,
                      flex: 1,
                    }}
                  />
                  {isLastBlock ? <ChatGPTCursor inline /> : null}
                </View>
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
        width: '100%',
      }}>
      <View
        testID="learning-user-bubble"
        style={{
          backgroundColor: 'rgba(20, 20, 20, 0.05)',
          borderRadius: 16,
          maxWidth: '84%',
          paddingHorizontal: 16,
          paddingVertical: 12,
          width: needsRichUserRendering ? '84%' : undefined,
        }}>
        <View style={needsRichUserRendering ? { width: '100%' } : { flexDirection: 'row', alignItems: 'center' }}>
          <LearningRichText 
            content={text}
            style={userTextStyle}
          />
          {streaming ? <ChatGPTCursor inline /> : null}
        </View>
      </View>
    </View>
  );
}
