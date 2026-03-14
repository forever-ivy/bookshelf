import React from 'react';
import { render } from '@testing-library/react-native';

import { AppIcon, getNativeTabIconProps } from '@/components/base/app-icon';

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text: MockText } = require('react-native');

  const createIcon = (name: string) =>
    function MockLucideIcon(props: { color?: string; size?: number; strokeWidth?: number }) {
      return (
        <MockText testID={`lucide-${name.toLowerCase()}`}>
          {JSON.stringify({
            color: props.color,
            size: props.size,
            strokeWidth: props.strokeWidth,
          })}
        </MockText>
      );
    };

  return {
    BarChart3: createIcon('BarChart3'),
    Bookmark: createIcon('Bookmark'),
    Camera: createIcon('Camera'),
    Check: createIcon('Check'),
    ChevronLeft: createIcon('ChevronLeft'),
    House: createIcon('House'),
    Info: createIcon('Info'),
    LibraryBig: createIcon('LibraryBig'),
    PanelsTopLeft: createIcon('PanelsTopLeft'),
    Pencil: createIcon('Pencil'),
    Plus: createIcon('Plus'),
    QrCode: createIcon('QrCode'),
    Search: createIcon('Search'),
    Settings2: createIcon('Settings2'),
    Share2: createIcon('Share2'),
    Sparkles: createIcon('Sparkles'),
    Target: createIcon('Target'),
    Trash2: createIcon('Trash2'),
    Users: createIcon('Users'),
  };
});

describe('AppIcon', () => {
  it('renders lucide house icon for home', () => {
    const screen = render(<AppIcon color="#123456" name="home" size={18} strokeWidth={2.2} />);

    expect(screen.getByTestId('lucide-house')).toBeTruthy();
  });

  it('renders lucide qr code icon for qr', () => {
    const screen = render(<AppIcon name="qr" />);

    expect(screen.getByTestId('lucide-qrcode')).toBeTruthy();
  });

  it('returns native tabs icon props that avoid unsupported lucide React elements', () => {
    expect(getNativeTabIconProps('home')).toEqual({
      md: 'home',
      sf: { default: 'house', selected: 'house.fill' },
    });
    expect(getNativeTabIconProps('book')).toEqual({
      md: 'local_library',
      sf: { default: 'books.vertical', selected: 'books.vertical.fill' },
    });
    expect(getNativeTabIconProps('chart')).toEqual({
      md: 'bar_chart',
      sf: { default: 'chart.bar', selected: 'chart.bar.fill' },
    });
    expect(getNativeTabIconProps('settings')).toEqual({
      md: 'settings',
      sf: { default: 'gearshape', selected: 'gearshape.fill' },
    });
  });
});
