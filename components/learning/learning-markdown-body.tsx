import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/styles/hljs';
import { Copy } from 'lucide-react-native';

import { LearningRichText } from '@/components/learning/learning-rich-text';
import { useAppTheme } from '@/hooks/use-app-theme';

type LearningMarkdownBodyProps = {
  content: string;
  streaming?: boolean;
  tone?: 'muted' | 'primary';
};

const MATH_CONTENT_PATTERN =
  /\$\$|(?<!\\)\$[^$\n]+(?<!\\)\$|\\\(|\\\[|\\(?:frac|sum|prod|lim|int|sqrt|left|right|cdot|times|sin|cos|tan|ln|log|alpha|beta|gamma|theta|lambda|mu|pi|sigma|phi|omega|rightarrow|to|infty|leq|geq|neq|approx|partial|nabla|binom|mathrm|text)\b|[A-Za-z0-9)\]}][_^]\{/;

function getNodeText(node: any): string {
  if (typeof node?.content === 'string') {
    return node.content;
  }

  if (typeof node?.literal === 'string') {
    return node.literal;
  }

  if (Array.isArray(node?.children)) {
    return node.children.map(getNodeText).join('');
  }

  return '';
}

function getFenceLanguage(node: any) {
  const sourceInfo =
    typeof node?.sourceInfo === 'string'
      ? node.sourceInfo
      : typeof node?.info === 'string'
        ? node.info
        : '';
  const language = sourceInfo.trim().split(/\s+/)[0] ?? '';
  return language || 'text';
}

async function copyCodeToClipboard(value: string) {
  try {
    const clipboardModule = require('expo-clipboard') as
      | {
          setStringAsync?: (nextValue: string) => Promise<void>;
          default?: {
            setStringAsync?: (nextValue: string) => Promise<void>;
          };
        }
      | undefined;
    const setStringAsync =
      clipboardModule.setStringAsync ?? clipboardModule.default?.setStringAsync;

    if (typeof setStringAsync === 'function') {
      await setStringAsync(value);
      return;
    }
  } catch {
    // Fall through to web clipboard when the native module is not linked yet.
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
  }
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const { theme } = useAppTheme();
  const CopyIcon = Copy as React.ComponentType<any>;
  const normalizedCode = code.replace(/\n$/, '');

  return (
    <View
      style={{
        backgroundColor: '#101418',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
      }}>
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: 'rgba(255,255,255,0.08)',
          borderBottomWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
        <Text
          selectable
          style={{
            color: 'rgba(255,255,255,0.68)',
            ...theme.typography.medium,
            fontSize: 12,
          }}>
          {language}
        </Text>
        <Pressable
          accessibilityLabel="复制代码"
          accessibilityRole="button"
          onPress={() => {
            void copyCodeToClipboard(normalizedCode);
          }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.72 : 1,
            padding: 4,
          })}>
          <CopyIcon color="rgba(255,255,255,0.72)" size={15} strokeWidth={1.8} />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View testID="learning-markdown-code-block" style={{ minWidth: '100%', padding: 12 }}>
          <SyntaxHighlighter
            fontFamily={Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })}
            fontSize={13}
            highlighter="hljs"
            language={language}
            style={atomOneDark}>
            {normalizedCode}
          </SyntaxHighlighter>
        </View>
      </ScrollView>
    </View>
  );
}

function StreamingCursor() {
  const { theme } = useAppTheme();

  return (
    <Text selectable={false} style={{ color: theme.colors.textSoft }}>
      ●
    </Text>
  );
}

export function LearningMarkdownBody({
  content,
  streaming = false,
  tone = 'primary',
}: LearningMarkdownBodyProps) {
  const { theme } = useAppTheme();
  const isPrimary = tone === 'primary';
  const bodyStyle = {
    color: isPrimary ? theme.colors.text : theme.colors.textMuted,
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    fontSize: isPrimary ? 17 : 16,
    lineHeight: isPrimary ? 28 : 26,
  };
  const hasCodeFence = /```|~~~/.test(content);

  if (MATH_CONTENT_PATTERN.test(content) && !hasCodeFence) {
    return (
      <LearningRichText
        content={content}
        style={bodyStyle}
        webViewTestID="learning-markdown-math-body"
      />
    );
  }

  const rules = {
    code_block: (node: any) => (
      <CodeBlock code={getNodeText(node)} key={node.key} language="text" />
    ),
    fence: (node: any) => (
      <CodeBlock code={getNodeText(node)} key={node.key} language={getFenceLanguage(node)} />
    ),
  };

  return (
    <View style={{ gap: 8 }}>
      <Markdown
        mergeStyle
        rules={rules}
        style={{
          blockquote: {
            backgroundColor: 'transparent',
            borderLeftColor: theme.colors.primaryStrong,
            borderLeftWidth: 3,
            marginLeft: 0,
            paddingLeft: 12,
          },
          body: bodyStyle,
          bullet_list: {
            marginVertical: 4,
          },
          code_inline: {
            backgroundColor: theme.colors.surfaceMuted,
            borderRadius: 5,
            color: theme.colors.text,
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
            paddingHorizontal: 4,
          },
          fence: {
            marginVertical: 8,
          },
          heading1: {
            color: theme.colors.text,
            fontSize: 24,
            fontWeight: '700',
            lineHeight: 31,
            marginBottom: 8,
            marginTop: 10,
          },
          heading2: {
            color: theme.colors.text,
            fontSize: 21,
            fontWeight: '700',
            lineHeight: 28,
            marginBottom: 8,
            marginTop: 10,
          },
          heading3: {
            color: theme.colors.text,
            fontSize: 18,
            fontWeight: '700',
            lineHeight: 25,
            marginBottom: 6,
            marginTop: 8,
          },
          hr: {
            backgroundColor: theme.colors.borderSoft,
          },
          link: {
            color: theme.colors.primaryStrong,
          },
          ordered_list: {
            marginVertical: 4,
          },
          paragraph: {
            marginBottom: 8,
            marginTop: 0,
          },
          table: {
            borderColor: theme.colors.borderSoft,
            borderWidth: 1,
          },
          text: bodyStyle,
        }}>
        {content}
      </Markdown>
      {streaming ? <StreamingCursor /> : null}
    </View>
  );
}
