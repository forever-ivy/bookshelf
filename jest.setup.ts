import type { ForwardedRef } from 'react';

jest.mock('expo-image', () => {
  const React = require('react');
  const { Image } = require('react-native');

  return {
    Image: React.forwardRef(
      (props: Record<string, unknown>, ref: ForwardedRef<unknown>) =>
        React.createElement(Image, { ...props, ref })
    ),
  };
});
