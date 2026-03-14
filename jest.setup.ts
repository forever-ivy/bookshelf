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

jest.mock('@expo/ui/swift-ui', () => {
  const React = require('react');
  const { TextInput, View } = require('react-native');
  const MockTextField = React.forwardRef(
    (props: Record<string, unknown>, ref: ForwardedRef<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        blur: async () => undefined,
        focus: async () => undefined,
        setSelection: async () => undefined,
        setText: async () => undefined,
      }));

      return React.createElement(TextInput, props);
    }
  );

  return {
    BottomSheet: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'swift-bottom-sheet' }, children),
    Button: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'swift-button' }, children),
    Host: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'swift-host' }, children),
    RNHostView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'swift-rn-host' }, children),
    TextField: MockTextField,
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  buttonStyle: jest.fn(() => ({ type: 'buttonStyle' })),
  controlSize: jest.fn(() => ({ type: 'controlSize' })),
  disabled: jest.fn(() => ({ type: 'disabled' })),
  frame: jest.fn(() => ({ type: 'frame' })),
  textFieldStyle: jest.fn(() => ({ type: 'textFieldStyle' })),
  tint: jest.fn(() => ({ type: 'tint' })),
}));

jest.mock('@expo/ui/jetpack-compose', () => {
  const React = require('react');
  const { TextInput, View } = require('react-native');
  const MockTextInput = React.forwardRef(
    (props: Record<string, unknown>, ref: ForwardedRef<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        setText: async () => undefined,
      }));

      return React.createElement(TextInput, props);
    }
  );

  return {
    Button: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'compose-button' }, children),
    Host: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'compose-host' }, children),
    ModalBottomSheet: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'compose-bottom-sheet' }, children),
    RNHostView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'compose-rn-host' }, children),
    TextInput: MockTextInput,
  };
});

jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({
  fillMaxWidth: jest.fn(() => ({ type: 'fillMaxWidth' })),
}));
