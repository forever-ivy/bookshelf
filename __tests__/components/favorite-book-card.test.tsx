import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { FavoriteBookCard } from '@/components/favorites/favorite-book-card';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('FavoriteBookCard', () => {
  const baseProps = {
    availabilityLabel: '馆藏充足 · 可立即借阅',
    author: '周志华',
    coverTone: 'lavender' as const,
    summary: '适合课程导读和期末复习的入门书，适合课程导读和期末复习的入门书。',
    title: '机器学习',
  };

  it('renders the borrowing-style card content for a favorite book', () => {
    render(<FavoriteBookCard {...baseProps} />);

    const summaryText = screen.getByTestId('favorite-book-card-summary-text');

    expect(screen.queryByText('借阅中')).toBeNull();
    expect(screen.getByText('机器学习')).toBeTruthy();
    expect(screen.getByText('周志华')).toBeTruthy();
    expect(screen.getByText('馆藏充足 · 可立即借阅')).toBeTruthy();
    expect(summaryText).toBeTruthy();
    expect(summaryText.props.numberOfLines).toBe(2);
    expect(summaryText.props.ellipsizeMode).toBe('clip');
    expect(screen.queryByText(/分类：/)).toBeNull();
    expect(screen.getByText('查看详情')).toBeTruthy();
    expect(screen.getByTestId('favorite-book-card-cover')).toBeTruthy();
    expect(screen.getByTestId('favorite-book-card-detail-chevron')).toBeTruthy();
    expect(screen.queryByTestId('favorite-book-card-summary-chevron')).toBeNull();
  });

  it('does not render the borrowing status chip', () => {
    render(<FavoriteBookCard {...baseProps} />);

    expect(screen.queryByTestId('favorite-book-card-status')).toBeNull();
    expect(screen.queryByText('借阅中')).toBeNull();
  });

  it('shows a summary expand chevron only when the summary overflows two lines and expands on press', () => {
    render(<FavoriteBookCard {...baseProps} />);

    const summaryText = screen.getByTestId('favorite-book-card-summary-text');

    fireEvent(screen.getByTestId('favorite-book-card-summary-measure'), 'textLayout', {
      nativeEvent: {
        lines: [{ text: '第一行' }, { text: '第二行' }, { text: '第三行' }],
      },
    });

    expect(screen.getByTestId('favorite-book-card-summary-chevron')).toBeTruthy();

    fireEvent.press(screen.getByTestId('favorite-book-card-summary'));

    expect(summaryText.props.numberOfLines).toBeUndefined();
  });

  it('keeps the summary chevron hidden when the summary fits within two lines', () => {
    render(<FavoriteBookCard {...baseProps} />);

    fireEvent(screen.getByTestId('favorite-book-card-summary-measure'), 'textLayout', {
      nativeEvent: {
        lines: [{ text: '第一行' }, { text: '第二行' }],
      },
    });

    expect(screen.queryByTestId('favorite-book-card-summary-chevron')).toBeNull();
  });

  it('calls onPress when the detail action is tapped', () => {
    const handlePress = jest.fn();

    render(<FavoriteBookCard {...baseProps} onPress={handlePress} />);

    fireEvent.press(screen.getByTestId('favorite-book-card-action'));

    expect(handlePress).toHaveBeenCalledTimes(1);
  });
});
