import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SearchResultCard } from '@/components/search/search-result-card';
import { appTheme } from '@/constants/app-theme';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

describe('SearchResultCard availability chip', () => {
  const baseProps = {
    author: '示例作者',
    coverTone: 'mint' as const,
    eta: '可送达',
    location: '主书柜',
    title: '示例图书',
    variant: 'card' as const,
  };

  it.each([
    ['馆藏充足 · 可立即借阅', '#DCFCE7', '#1F8A43'],
    ['可到柜自取', '#DBEAFE', '#2563EB'],
    ['暂不可借', '#FEF3C7', '#B45309'],
  ])('renders %s with dedicated colors', (availability, backgroundColor, color) => {
    render(<SearchResultCard {...baseProps} availability={availability} />);

    const chipLabel = screen.getByText(availability);
    const chipShell = chipLabel.parent?.parent;

    expect(chipShell?.props.style).toEqual(expect.objectContaining({ backgroundColor }));
    expect(chipLabel.props.style).toEqual(expect.objectContaining({ color }));
  });
});

describe('SearchResultCard list row', () => {
  const baseProps = {
    author: '示例作者',
    coverTone: 'mint' as const,
    eta: '可送达',
    location: '主书柜',
    title: '示例图书',
    variant: 'list' as const,
  };

  it('renders the list row as a single press target with a trailing 查看 action', () => {
    const handlePress = jest.fn();

    render(
      <SearchResultCard
        {...baseProps}
        availability="馆藏充足 · 可立即借阅"
        onPress={handlePress}
        reason="A desert planet epic."
      />
    );

    fireEvent.press(screen.getByTestId('search-result-cell'));

    expect(handlePress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('A desert planet epic.').props.numberOfLines).toBe(2);
    expect(screen.queryByText('馆藏充足 · 可立即借阅')).toBeNull();
    expect(screen.queryByText('可送达')).toBeNull();
    expect(screen.queryByText('示例作者')).toBeNull();
    expect(screen.queryByText('主书柜')).toBeNull();
    expect(screen.getByTestId('search-result-cover-shell').props.style).toEqual(
      expect.objectContaining({
        borderRadius: 14,
        height: 68,
        width: 50,
      })
    );
    expect(screen.getByTestId('search-result-cover-icon-shell')).toBeTruthy();
    expect(screen.getByTestId('search-result-cover-image')).toBeTruthy();
    expect(screen.queryByTestId('search-result-cover-apple-icon')).toBeNull();
    expect(screen.getByTestId('search-result-action-chevron')).toBeTruthy();
    expect(screen.getByTestId('search-result-action-shell').props.style).toEqual(
      expect.objectContaining({
        height: 24,
        width: 20,
      })
    );
  });

  it.each([null, undefined, 'NaN', 'nan'])(
    'falls back to 猜你感兴趣 when recommendation reason is %p',
    (reason) => {
      render(
        <SearchResultCard
          {...baseProps}
          availability="馆藏充足 · 可立即借阅"
          reason={reason}
        />
      );

      expect(screen.getByText('猜你感兴趣')).toBeTruthy();
    }
  );

  it('does not render a recommendation reason block when no reason is provided', () => {
    render(
      <SearchResultCard
        {...baseProps}
        availability="馆藏充足 · 可立即借阅"
        reason={null}
      />
    );

    expect(screen.getByText('猜你感兴趣')).toBeTruthy();
  });
});
