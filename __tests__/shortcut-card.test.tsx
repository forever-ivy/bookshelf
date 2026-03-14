import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ShortcutCard } from '@/components/actions/shortcut-card';

describe('ShortcutCard', () => {
  it('renders title and description and triggers the action', () => {
    const onPress = jest.fn();
    const screen = render(
      <ShortcutCard
        description="Jump into the bookshelf overview."
        icon="cabinet"
        onPress={onPress}
        title="View Shelf"
      />
    );

    expect(screen.getByText('View Shelf')).toBeTruthy();
    expect(screen.getByText('Jump into the bookshelf overview.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
