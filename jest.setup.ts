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

jest.mock('expo-image-picker', () => {
  const grantedPermission = {
    accessPrivileges: 'all',
    canAskAgain: true,
    granted: true,
    status: 'granted',
  };

  return {
    launchCameraAsync: jest.fn(async () => ({ assets: null, canceled: true })),
    launchImageLibraryAsync: jest.fn(async () => ({ assets: null, canceled: true })),
    requestCameraPermissionsAsync: jest.fn(async () => grantedPermission),
    requestMediaLibraryPermissionsAsync: jest.fn(async () => grantedPermission),
    useCameraPermissions: jest.fn(() => [grantedPermission, jest.fn(), jest.fn()]),
    useMediaLibraryPermissions: jest.fn(() => [grantedPermission, jest.fn(), jest.fn()]),
  };
});

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GlassContainer: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
    }) => React.createElement(View, props, children),
    GlassView: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
    }) => React.createElement(View, props, children),
    isGlassEffectAPIAvailable: jest.fn(() => false),
    isLiquidGlassAvailable: jest.fn(() => false),
  };
});
