import * as React from 'react';
import { Text, type TextStyle, type ViewStyle } from 'react-native';

export type SyntaxHighlighterProps = {
  children?: React.ReactNode;
  fontFamily?: string;
  fontSize?: number;
  highlighter?: 'hljs' | 'prism' | string;
  language?: string;
  style?: Record<string, TextStyle | ViewStyle | unknown>;
};

export default function SyntaxHighlighter(props: SyntaxHighlighterProps) {
  return React.createElement(Text, null, props.children);
}
