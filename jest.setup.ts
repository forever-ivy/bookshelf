import type { ForwardedRef } from 'react';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const chain = {
    damping: () => chain,
    delay: () => chain,
    duration: () => chain,
    springify: () => chain,
    stiffness: () => chain,
  };

  return {
    __esModule: true,
    Easing: {
      ease: 'ease',
      inOut: (value: unknown) => value,
    },
    FadeInDown: chain,
    FadeInUp: chain,
    FadeOutUp: chain,
    Layout: chain,
    LinearTransition: chain,
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

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, props, children),
    ScrollView: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, props, children),
    Swipeable: ({
      children,
      renderRightActions,
      ...props
    }: {
      children?: React.ReactNode;
      renderRightActions?: () => React.ReactNode;
      [key: string]: unknown;
    }) =>
      React.createElement(
        View,
        props,
        renderRightActions ? renderRightActions() : null,
        children
      ),
  };
});

jest.mock('react-native-keyboard-controller', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    KeyboardAvoidingView: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
    KeyboardProvider: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement(View, props, children),
  };
});

jest.mock('@expo/react-native-action-sheet', () => {
  const React = require('react');

  return {
    ActionSheetProvider: React.forwardRef(
      (
        { children }: { children?: React.ReactNode },
        ref: React.ForwardedRef<unknown>
      ) => {
        React.useImperativeHandle(ref, () => ({
          showActionSheetWithOptions: jest.fn(),
        }));
        return children;
      }
    ),
  };
});

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => {}),
}));

jest.mock('react-native-gifted-chat', () => {
  const React = require('react');
  const { Pressable, Text, TextInput, View } = require('react-native');

  const GiftedChat = (props: any) => {
    const messages = Array.isArray(props.messages) ? props.messages : [];
    const renderChatEmpty = props.renderChatEmpty;
    const renderMessage = props.renderMessage;
    const renderAccessory = props.renderAccessory;
    const onSend = props.onSend;
    const textInputProps = props.textInputProps ?? {};

    return React.createElement(
      View,
      { listProps: props.listProps, testID: 'learning-gifted-chat' },
      React.createElement(View, {
        contentContainerStyle: props.listProps?.contentContainerStyle,
        testID: 'learning-workspace-screen',
      }),
      messages.length === 0 ? renderChatEmpty?.() : null,
      messages.map((message: any) =>
        React.createElement(
          View,
          { key: String(message._id) },
          renderMessage?.({ currentMessage: message })
        )
      ),
      renderAccessory?.(),
      React.createElement(TextInput, {
        editable: textInputProps.editable,
        onChangeText: textInputProps.onChangeText,
        placeholder: textInputProps.placeholder,
        testID: textInputProps.testID ?? 'learning-workspace-composer-input',
        value: props.text,
      }),
      React.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          disabled: textInputProps.editable === false,
          onPress: () => onSend?.([{ text: String(props.text ?? '') }]),
          testID: 'learning-workspace-composer-send',
        },
        React.createElement(Text, null, 'send')
      )
    );
  };

  return {
    Composer: (props: any) =>
      React.createElement(TextInput, {
        onChangeText: props.textInputProps?.onChangeText,
        placeholder: props.textInputProps?.placeholder,
        testID:
          props.textInputProps?.testID ?? 'learning-workspace-composer-input',
        value: props.text,
      }),
    GiftedChat,
    InputToolbar: ({ children }: any) =>
      React.createElement(View, { testID: 'learning-gifted-input-toolbar' }, children),
    Send: ({ children, onSend, text }: any) =>
      React.createElement(
        Pressable,
        {
          onPress: () =>
            onSend?.({ text: String(text ?? '') }, true),
          testID: 'learning-gifted-send',
        },
        children
      ),
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

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ assets: null, canceled: true })),
}));

jest.mock('expo/fetch', () => ({
  fetch: (...args: Parameters<typeof fetch>) => global.fetch(...args),
}));

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

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockWebView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: ForwardedRef<unknown>
    ) => {
      React.useImperativeHandle(ref, () => ({
        postMessage: jest.fn(),
        reload: jest.fn(),
      }));

      return React.createElement(View, props, props.children);
    }
  );

  return {
    WebView: MockWebView,
  };
});

jest.mock('heroui-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Skeleton = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-skeleton', ...props }, children);

  const SkeletonGroupRoot = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(
      View,
      { accessibilityLabel: 'heroui-skeleton-group', ...props },
      children
    );

  const SkeletonGroupItem = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(
      View,
      { accessibilityLabel: 'heroui-skeleton-group-item', ...props },
      children
    );

  const Card = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-card', ...props }, children);

  const BottomSheetRoot = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet', ...props }, children);

  const BottomSheetPortal = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-portal', ...props }, children);

  const BottomSheetOverlay = (props: Record<string, unknown>) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-overlay', ...props });

  const BottomSheetContent = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-content', ...props }, children);

  const BottomSheetTrigger = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-trigger', ...props }, children);

  const BottomSheetClose = (props: Record<string, unknown>) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-close', ...props });

  const BottomSheetTitle = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-title', ...props }, children);

  const BottomSheetDescription = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-description', ...props }, children);

  return {
    BottomSheet: Object.assign(BottomSheetRoot, {
      Portal: BottomSheetPortal,
      Overlay: BottomSheetOverlay,
      Content: BottomSheetContent,
      Trigger: BottomSheetTrigger,
      Close: BottomSheetClose,
      Title: BottomSheetTitle,
      Description: BottomSheetDescription,
    }),
    Card,
    Skeleton,
    SkeletonGroup: Object.assign(SkeletonGroupRoot, {
      Item: SkeletonGroupItem,
    }),
  };
});

jest.mock('heroui-native/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const BottomSheetRoot = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet', ...props }, children);

  const BottomSheetPortal = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-portal', ...props }, children);

  const BottomSheetOverlay = (props: Record<string, unknown>) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-overlay', ...props });

  const BottomSheetContent = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-content', ...props }, children);

  const BottomSheetTrigger = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-trigger', ...props }, children);

  const BottomSheetClose = (props: Record<string, unknown>) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-close', ...props });

  const BottomSheetTitle = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-title', ...props }, children);

  const BottomSheetDescription = ({
    children,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement(View, { accessibilityLabel: 'heroui-bottom-sheet-description', ...props }, children);

  return {
    BottomSheet: Object.assign(BottomSheetRoot, {
      Portal: BottomSheetPortal,
      Overlay: BottomSheetOverlay,
      Content: BottomSheetContent,
      Trigger: BottomSheetTrigger,
      Close: BottomSheetClose,
      Title: BottomSheetTitle,
      Description: BottomSheetDescription,
    }),
  };
});

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

jest.mock('sonner-native', () => ({
  Toaster: () => null,
  toast: {
    dismiss: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

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
    BottomSheet: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, { testID: 'swift-bottom-sheet', ...props }, children),
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
    Group: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, { testID: 'swift-group', ...props }, children),
    HStack: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(View, { testID: 'swift-hstack' }, children),
    Image: ({ systemName }: { systemName?: string }) =>
      React.createElement(Text, { testID: 'swift-image' }, systemName),
    ProgressView: () => React.createElement(Text, { testID: 'swift-progress' }, 'progress-view'),
    RNHostView: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, { testID: 'swift-rn-host', ...props }, children),
    ScrollView: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement(View, { testID: 'swift-scroll-view', ...props }, children),
    Spacer: () => React.createElement(View, { testID: 'swift-spacer' }),
    Text: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(Text, { testID: 'swift-text' }, children),
    TextField: MockTextField,
  };
});

jest.mock('@expo/ui/swift-ui/modifiers', () => ({
  background: jest.fn((color: string) => ({ color, type: 'background' })),
  buttonStyle: jest.fn(() => ({ type: 'buttonStyle' })),
  controlSize: jest.fn(() => ({ type: 'controlSize' })),
  disabled: jest.fn((value: boolean) => ({ type: 'disabled', value })),
  frame: jest.fn(() => ({ type: 'frame' })),
  glassEffect: jest.fn(() => ({ type: 'glassEffect' })),
  interactiveDismissDisabled: jest.fn(() => ({ type: 'interactiveDismissDisabled' })),
  labelStyle: jest.fn(() => ({ type: 'labelStyle' })),
  opacity: jest.fn(() => ({ type: 'opacity' })),
  padding: jest.fn(() => ({ type: 'padding' })),
  presentationDetents: jest.fn(() => ({ type: 'presentationDetents' })),
  presentationDragIndicator: jest.fn(() => ({ type: 'presentationDragIndicator' })),
  progressViewStyle: jest.fn(() => ({ type: 'progressViewStyle' })),
  scrollContentBackground: jest.fn((visible: 'automatic' | 'hidden' | 'visible') => ({
    type: 'scrollContentBackground',
    visible,
  })),
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

jest.mock('heroui-native/provider', () => {
  const React = require('react');

  return {
    __esModule: true,
    HeroUINativeProvider: ({ children }: { children?: React.ReactNode }) => children ?? null,
  };
});

jest.mock('heroui-native/input', () => {
  const React = require('react');
  const { TextInput } = require('react-native');

  const MockInput = React.forwardRef(
    (
      props: Record<string, unknown> & {
        className?: string;
        placeholderColorClassName?: string;
        selectionColorClassName?: string;
      },
      ref: ForwardedRef<unknown>
    ) => {
      const {
        className: _className,
        placeholderColorClassName: _placeholderColorClassName,
        selectionColorClassName: _selectionColorClassName,
        ...restProps
      } = props;

      return React.createElement(TextInput, { ...restProps, ref });
    }
  );

  return {
    __esModule: true,
    Input: MockInput,
  };
});
