import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { GlassActionButton } from '@/components/actions/glass-action-button';
import { GlassPillButton } from '@/components/actions/glass-pill-button';

jest.mock('@/components/base/app-icon', () => {
  const React = require('react');
  const { Text: MockText } = require('react-native');

  return {
    AppIcon: ({
      color,
      name,
      size,
    }: {
      color: string;
      name: string;
      size: number;
    }) => <MockText>{`${name}:${size}:${color}`}</MockText>,
  };
});

describe('glass buttons', () => {
  it('renders a loading action button with liquid glass background', () => {
    const screen = render(
      <GlassActionButton label="保存目标" loading onPress={jest.fn()} variant="primary" />
    );

    expect(screen.getByTestId('glass-action-button-native-host')).toBeTruthy();
    expect(screen.getByTestId('glass-action-button-glass')).toBeTruthy();
    expect(screen.getByTestId('glass-action-button-spinner')).toBeTruthy();
    expect(screen.getByText('保存目标')).toBeTruthy();
  });

  it('renders a pill button and handles presses', () => {
    const onPress = jest.fn();
    const screen = render(
      <GlassPillButton icon="search" label="看看书架" onPress={onPress} />
    );

    fireEvent.press(screen.getByRole('button'));

    expect(screen.getByText(/^search:18:/)).toBeTruthy();
    expect(screen.getByText('看看书架')).toBeTruthy();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the iOS pill button inside a glass view shell', () => {
    const screen = render(<GlassPillButton icon="back" onPress={jest.fn()} />);

    expect(screen.getByTestId('glass-pill-button-native-host')).toBeTruthy();
    expect(screen.getByTestId('glass-pill-button-glass')).toBeTruthy();
    expect(screen.getByLabelText('返回')).toBeTruthy();
  });
});
