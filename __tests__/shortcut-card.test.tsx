import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';

import { ShortcutCard } from '@/components/actions/shortcut-card';

const renderer = require('react-test-renderer') as {
  act: (callback: () => void) => void;
  create: (element: React.ReactElement) => {
    root: {
      findAllByType: (type: unknown) => Array<{ props: { style?: unknown } }>;
    };
  };
};

describe('ShortcutCard', () => {
  it('renders title and description and triggers the action', () => {
    const onPress = jest.fn();
    const screen = render(
      <ShortcutCard
        icon="cabinet"
        onPress={onPress}
        title="View Shelf"
      />
    );

    expect(screen.getByText('View Shelf')).toBeTruthy();

    fireEvent.press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps shortcut content compact instead of stretching icon and copy apart', () => {
    let tree:
      | {
          root: {
            findAllByType: (type: unknown) => Array<{ props: { style?: unknown } }>;
          };
        }
      | undefined;

    renderer.act(() => {
      tree = renderer.create(
        <ShortcutCard
          icon="cabinet"
          onPress={() => {}}
          title="View Shelf"
        />
      );
    });

    const contentWrap = tree!.root.findAllByType(View)[1];

    expect(contentWrap.props.style).toMatchObject({
      gap: 14,
      justifyContent: 'flex-start',
    });
  });

  it('uses a fixed card height so shortcut grids stay visually even', () => {
    let tree:
      | {
          root: {
            findAllByType: (type: unknown) => Array<{ props: { style?: unknown } }>;
          };
        }
      | undefined;

    renderer.act(() => {
      tree = renderer.create(
        <ShortcutCard
          icon="cabinet"
          onPress={() => {}}
          title="View Shelf"
        />
      );
    });

    const pressable = tree!.root.findAllByType(View)[0];

    expect(pressable.props.style).toMatchObject({
      height: 108,
    });
  });

  it('supports a compact square-like variant for dense action grids', () => {
    let tree:
      | {
          root: {
            findAllByType: (type: unknown) => Array<{ props: { style?: unknown } }>;
          };
        }
      | undefined;

    renderer.act(() => {
      tree = renderer.create(
        <ShortcutCard
          icon="cabinet"
          onPress={() => {}}
          size="compact"
          title="View Shelf"
        />
      );
    });

    const pressable = tree!.root.findAllByType(View)[0];

    expect(pressable.props.style).toMatchObject({
      height: 96,
      minHeight: 96,
    });
  });
});
