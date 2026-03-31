import type { ForwardedRef } from 'react';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const chain = {
    delay: () => chain,
    duration: () => chain,
  };

  return {
    __esModule: true,
    Easing: {
      ease: 'ease',
      inOut: (value: unknown) => value,
    },
    FadeInUp: chain,
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withRepeat: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children),
    },
  };
});

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

jest.mock('expo-blur', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    BlurView: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-glass-effect', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GlassContainer: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
    GlassView: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
    isGlassEffectAPIAvailable: jest.fn(() => true),
    isLiquidGlassAvailable: jest.fn(() => true),
  };
});

jest.mock('@expo/ui/swift-ui', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');
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
    Button: ({
      children,
      label,
      modifiers,
      onPress,
      systemImage,
      ...restProps
    }: {
      children?: React.ReactNode;
      label?: string;
      modifiers?: Array<{ type?: string; value?: boolean }>;
      onPress?: () => void;
      systemImage?: string;
      [key: string]: unknown;
    }) => {
      const isDisabled = modifiers?.some(
        (modifier) => modifier.type === 'disabled' && modifier.value
      );
      const hasProgressDescendant = (node: React.ReactNode): boolean => {
        return React.Children.toArray(node).some((child: any) => {
          if (!React.isValidElement(child)) {
            return false;
          }

          if (child.props?.testID === 'swift-progress') {
            return true;
          }

          return hasProgressDescendant(child.props?.children);
        });
      };
      const isBusy = hasProgressDescendant(children);

      return (
        React.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityState: {
              busy: isBusy || undefined,
              disabled: isDisabled || undefined,
            },
            disabled: isDisabled,
            onPress: isDisabled ? undefined : onPress,
            testID: 'swift-button',
            ...restProps,
          },
          systemImage ? React.createElement(Text, null, systemImage) : null,
          label ? React.createElement(Text, null, label) : null,
          children
        )
      );
    },
    Host: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, { testID: 'swift-host', ...props }, children),
    HStack: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'swift-hstack' }, children),
    Image: ({ systemName }: { systemName?: string }) =>
      React.createElement(Text, { testID: 'swift-image' }, systemName),
    ProgressView: () => React.createElement(Text, { testID: 'swift-progress' }, 'progress-view'),
    RNHostView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'swift-rn-host' }, children),
    Spacer: () => React.createElement(View, { testID: 'swift-spacer' }),
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, { testID: 'swift-text' }, children),
    TextField: MockTextField,
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  buttonStyle: jest.fn(() => ({ type: 'buttonStyle' })),
  controlSize: jest.fn(() => ({ type: 'controlSize' })),
  disabled: jest.fn((value: boolean) => ({ type: 'disabled', value })),
  frame: jest.fn(() => ({ type: 'frame' })),
  glassEffect: jest.fn(() => ({ type: 'glassEffect' })),
  labelStyle: jest.fn(() => ({ type: 'labelStyle' })),
  opacity: jest.fn(() => ({ type: 'opacity' })),
  padding: jest.fn(() => ({ type: 'padding' })),
  progressViewStyle: jest.fn(() => ({ type: 'progressViewStyle' })),
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
