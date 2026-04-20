import katex from 'katex';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useAppTheme } from '@/hooks/use-app-theme';
import {
  learningTextHasMalformedMath,
  sanitizeMalformedLearningText,
} from '@/lib/learning/text-formatting';

type LearningRichTextProps = {
  allowFontScaling?: boolean;
  content: string;
  maxFontSizeMultiplier?: number;
  numberOfLines?: number;
  style?: any;
};

type LearningRichTextTypography = {
  color: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: string;
  fontWeight?: string | number;
  letterSpacing?: number;
  lineHeight?: number;
};

type MathChunk = {
  displayMode: boolean;
  expression: string;
};

const MATH_MARKER = /\$|\\\(|\\\[/;
const MD_MARKER = /\*\*|__|\*|_|#|^- /m;
const MATH_TOKEN_PREFIX = '@@LEARNING_MATH_';
const MATH_PATTERN =
  /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;
const RAW_LATEX_COMMAND_PATTERN =
  /\\(?:frac|sum|prod|lim|int|sqrt|left|right|cdot|times|sin|cos|tan|ln|log|alpha|beta|gamma|theta|lambda|mu|pi|sigma|phi|omega|rightarrow|to|infty|leq|geq|neq|approx|partial|nabla|binom|mathrm|text)\b/;
const RAW_SUPERSCRIPT_PATTERN = /[A-Za-z0-9)\]}]\^\{[^}]+\}(?:\([^)]*\))?/;
const RAW_SUBSCRIPT_PATTERN = /[A-Za-z0-9)\]}]_\{[^}]+\}(?:\([^)]*\))?/;
const RAW_INLINE_TOKEN_PATTERN =
  /([A-Za-z][A-Za-z0-9]*?(?:\^\{[^}]+\}|_\{[^}]+\})+(?:\([^)]*\))?)/g;

function escapeHtml(content: string) {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function hasExplicitMathDelimiter(content: string) {
  return MATH_MARKER.test(content);
}

function looksLikeStandaloneMathLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || hasExplicitMathDelimiter(trimmed)) {
    return false;
  }

  const hasLatexCommand = RAW_LATEX_COMMAND_PATTERN.test(trimmed);
  const hasSuperscript = RAW_SUPERSCRIPT_PATTERN.test(trimmed);
  const hasSubscript = RAW_SUBSCRIPT_PATTERN.test(trimmed);
  const hasEquationShape = /[=+\-]/.test(trimmed) || (trimmed.includes('(') && trimmed.includes(')'));
  const hasSentencePunctuation = /[。！？；;]/.test(trimmed);

  return !hasSentencePunctuation && ((hasLatexCommand && hasEquationShape) || (hasSuperscript && hasEquationShape) || (hasSubscript && hasEquationShape));
}

function normalizeStandaloneMathLines(content: string) {
  return content
    .split('\n')
    .map((line) => {
      if (!looksLikeStandaloneMathLine(line)) {
        return line;
      }

      return `$$ ${line.trim()} $$`;
    })
    .join('\n');
}

function normalizeInlineRawMath(content: string) {
  return content
    .split('\n')
    .map((line) => {
      if (!line.trim() || hasExplicitMathDelimiter(line)) {
        return line;
      }

      return line.replace(RAW_INLINE_TOKEN_PATTERN, (_match, token) => `$${token}$`);
    })
    .join('\n');
}

function normalizeLearningRichTextContent(content: string) {
  return normalizeInlineRawMath(normalizeStandaloneMathLines(content));
}

function renderMathChunk(chunk: MathChunk) {
  try {
    const mathml = katex.renderToString(chunk.expression, {
      displayMode: chunk.displayMode,
      output: 'mathml',
      strict: 'ignore',
      throwOnError: false,
    });

    return chunk.displayMode
      ? `<div class="math-display">${mathml}</div>`
      : `<span class="math-inline">${mathml}</span>`;
  } catch {
    return chunk.displayMode
      ? `<div class="math-display">${escapeHtml(chunk.expression)}</div>`
      : `<span class="math-inline">${escapeHtml(chunk.expression)}</span>`;
  }
}

function replaceMathWithTokens(content: string) {
  const chunks: MathChunk[] = [];
  const tokenizedContent = content.replace(
    MATH_PATTERN,
    (_raw, blockDollar, blockBracket, inlineParen, inlineDollar) => {
      const expression =
        String(blockDollar ?? blockBracket ?? inlineParen ?? inlineDollar ?? '').trim();
      const displayMode = blockDollar != null || blockBracket != null;
      const token = `${MATH_TOKEN_PREFIX}${chunks.length}@@`;

      chunks.push({
        displayMode,
        expression,
      });

      return token;
    }
  );

  return {
    chunks,
    tokenizedContent,
  };
}

function applyBasicMarkdown(content: string) {
  return content
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)$/gm, '• $1');
}

function restoreMathTokens(content: string, chunks: MathChunk[]) {
  return chunks.reduce((current, chunk, index) => {
    const token = `${MATH_TOKEN_PREFIX}${index}@@`;
    return current.replaceAll(token, renderMathChunk(chunk));
  }, content);
}

function resolveLearningRichTextTypography(
  input: LearningRichTextTypography | string
): LearningRichTextTypography {
  if (typeof input === 'string') {
    return { color: input };
  }

  return input;
}

export function buildLearningRichTextHtml(
  content: string,
  typography: LearningRichTextTypography | string
) {
  const resolvedTypography = resolveLearningRichTextTypography(typography);
  const safeContent = learningTextHasMalformedMath(content)
    ? sanitizeMalformedLearningText(content)
    : content;
  const normalizedContent = normalizeLearningRichTextContent(safeContent);
  const { chunks, tokenizedContent } = replaceMathWithTokens(normalizedContent);
  const escapedContent = escapeHtml(tokenizedContent);
  const markdownContent = applyBasicMarkdown(escapedContent);
  const richContent = restoreMathTokens(markdownContent, chunks);
  const cssFontFamily = resolvedTypography.fontFamily
    ? `"${resolvedTypography.fontFamily.replace(/"/g, '\\"')}"`
    : '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <style>
    :root {
      color-scheme: light;
    }
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      color: ${resolvedTypography.color};
      font-family: ${cssFontFamily};
      font-size: ${resolvedTypography.fontSize ?? 14}px;
      line-height: ${resolvedTypography.lineHeight ?? 21}px;
      font-weight: ${resolvedTypography.fontWeight ?? '400'};
      font-style: ${resolvedTypography.fontStyle ?? 'normal'};
      letter-spacing: ${resolvedTypography.letterSpacing ?? 0}px;
      overflow: hidden;
    }
    #content {
      white-space: pre-wrap;
      word-break: break-word;
    }
    .math-inline math {
      display: inline-block;
      font-size: 1em;
      vertical-align: middle;
    }
    .math-display {
      margin: 0.5em 0;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .math-display math {
      display: block;
      font-size: 1.05em;
    }
    h1, h2, h3 {
      margin: 0.5em 0;
      font-weight: 600;
    }
    h1 { font-size: 1.5em; }
    h2 { font-size: 1.25em; }
    h3 { font-size: 1.1em; }
    strong { font-weight: 600; }
    em { font-style: italic; }
  </style>
</head>
<body>
  <div id="content">${richContent}</div>
  <script>
    const el = document.getElementById('content');
    const report = () => {
      const h = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      if (h > 0) window.ReactNativeWebView.postMessage(String(h));
    };
    // Immediate
    report();
    // After layout / fonts
    window.addEventListener('load', report);
    // After MathML / KaTeX finishes painting
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(report);
      if (el) ro.observe(el);
      ro.observe(document.body);
    } else {
      setTimeout(report, 80);
      setTimeout(report, 300);
    }
  </script>
</body>
</html>
  `;
}

export function learningTextNeedsRichRendering(content: string) {
  return (
    MATH_MARKER.test(content) ||
    MD_MARKER.test(content) ||
    RAW_LATEX_COMMAND_PATTERN.test(content) ||
    RAW_SUPERSCRIPT_PATTERN.test(content) ||
    RAW_SUBSCRIPT_PATTERN.test(content)
  );
}

export function LearningRichText({
  allowFontScaling = true,
  content,
  maxFontSizeMultiplier,
  numberOfLines,
  style,
}: LearningRichTextProps) {
  const { theme } = useAppTheme();
  const hasFormatting = learningTextNeedsRichRendering(content);
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const [height, setHeight] = React.useState(numberOfLines ? numberOfLines * 24 : 120);

  if (!hasFormatting) {
    return (
      <Text
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        numberOfLines={numberOfLines}
        style={style}>
        {content}
      </Text>
    );
  }

  const html = buildLearningRichTextHtml(content, {
    color: flattenedStyle.color ?? theme.colors.text,
    fontFamily: flattenedStyle.fontFamily,
    fontSize: flattenedStyle.fontSize,
    fontStyle: flattenedStyle.fontStyle,
    fontWeight: flattenedStyle.fontWeight,
    letterSpacing: flattenedStyle.letterSpacing,
    lineHeight: flattenedStyle.lineHeight,
  });

  return (
    <View style={[{ height }, style]}>
      <WebView
        originWhitelist={['*']}
        scrollEnabled={false}
        source={{ html }}
        style={styles.webview}
        onMessage={(event) => {
          const nextHeight = Number.parseInt(event.nativeEvent.data, 10);
          if (!Number.isNaN(nextHeight) && nextHeight > 0) {
            setHeight(nextHeight);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});
