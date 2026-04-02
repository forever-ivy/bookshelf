import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { BooklistEntryCard } from '@/components/favorites/booklist-entry-card';

describe('BooklistEntryCard', () => {
  it('renders the entry-style booklist card and triggers press', () => {
    const handlePress = jest.fn();

    render(
      <BooklistEntryCard
        bookCount={6}
        description="更偏馆藏里当前能拿到的纸书，方便直接借阅。"
        onPress={handlePress}
        title="近期想借的纸书"
      />
    );

    expect(screen.getByText('近期想借的纸书')).toBeTruthy();
    expect(screen.getByText('更偏馆藏里当前能拿到的纸书，方便直接借阅。')).toBeTruthy();
    expect(screen.getByText('6 本图书')).toBeTruthy();
    expect(screen.queryByText('查看书单')).toBeNull();
    expect(screen.queryByTestId('booklist-entry-card-chevron')).toBeNull();

    fireEvent.press(screen.getByTestId('booklist-entry-card'));

    expect(handlePress).toHaveBeenCalledTimes(1);
  });
});
