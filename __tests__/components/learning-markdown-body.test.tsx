import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import React from 'react';

import { LearningMarkdownBody } from '@/components/learning/learning-markdown-body';

describe('LearningMarkdownBody', () => {
  it('renders markdown headings, lists, quotes, and inline code', () => {
    render(
      <LearningMarkdownBody
        content={[
          '## 主要内容',
          '',
          '> 先抓住核心问题。',
          '',
          '1. 认识 `state`',
          '2. 再理解事件流',
          '',
          '- 保留上下文',
        ].join('\n')}
      />
    );

    expect(screen.getByText('主要内容')).toBeTruthy();
    expect(screen.getByText('先抓住核心问题。')).toBeTruthy();
    expect(screen.getByText('认识')).toBeTruthy();
    expect(screen.getByText('state')).toBeTruthy();
    expect(screen.getByText('保留上下文')).toBeTruthy();
  });

  it('renders fenced code blocks with a language label and syntax highlighter', async () => {
    render(
      <LearningMarkdownBody
        content={[
          '```ts',
          'const answer = "stream";',
          '```',
        ].join('\n')}
      />
    );

    expect(screen.getByText('ts')).toBeTruthy();
    expect(screen.getByTestId('learning-markdown-code-block')).toBeTruthy();
    expect(screen.getByText('const answer = "stream";')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('复制代码'));
    await waitFor(() => {
      expect(Clipboard.setStringAsync).toHaveBeenCalledWith('const answer = "stream";');
    });
  });

  it('falls back to the existing math renderer for formulas instead of leaking raw latex', () => {
    render(
      <LearningMarkdownBody content="公式：$$ f(x) = \\frac{x}{1 - x^{2}} $$" />
    );

    const mathBody = screen.getByTestId('learning-markdown-math-body');
    expect(mathBody.props.source.html).toContain('<math');
    expect(mathBody.props.source.html).not.toContain('$$');
  });
});
