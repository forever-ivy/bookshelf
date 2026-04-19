import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { AuthInput } from '@/components/auth/auth-input';

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => ({
    theme: require('@/constants/app-theme').appTheme,
  }),
}));

jest.mock('heroui-native/input', () => {
  const React = require('react') as typeof import('react');
  const { TextInput } = require('react-native') as typeof import('react-native');

  const Input = React.forwardRef<any, any>((props, ref) =>
    React.createElement(TextInput, {
      ...props,
      ref,
      testID: props.testID ?? 'hero-input',
    })
  );

  return { Input };
});

describe('AuthInput', () => {
  it('renders against the real named export shape from heroui-native/input', () => {
    render(<AuthInput placeholder="用户名" testID="auth-input" value="" />);

    expect(screen.getByTestId('auth-input')).toBeTruthy();
  });
});
