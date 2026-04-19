import { Host, TextField } from '@expo/ui/swift-ui';
import { glassEffect, padding, submitLabel, textFieldStyle } from '@expo/ui/swift-ui/modifiers';
import { GitGraph } from 'lucide-react-native';
import React from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiquidGlassIconButton } from '@/components/navigation/liquid-glass-icon-button';
import { useAppTheme } from '@/hooks/use-app-theme';

import type { TextFieldRef } from '@expo/ui/swift-ui/TextField';

const INPUT_BAR_HEIGHT = 48;

function supportsSwiftUiGlass() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const majorVersion =
    typeof Platform.Version === 'string'
      ? Number.parseInt(Platform.Version, 10)
      : Platform.Version;

  return Number.isFinite(majorVersion) && Number(majorVersion) >= 26;
}

export function LearningGlassInputBar({
  onChangeText,
  onSubmit,
  onTabButtonPress,
  placeholder = '继续发散，追问细节...',
}: {
  onChangeText?: (text: string) => void;
  onSubmit?: (text: string) => void;
  onTabButtonPress?: () => void;
  placeholder?: string;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const textFieldRef = React.useRef<TextFieldRef>(null);
  const canUseGlass = supportsSwiftUiGlass();
  const [keyboardHeight, setKeyboardHeight] = React.useState(0);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const textFieldModifiers = React.useMemo(
    () => [
      textFieldStyle('plain'),
      padding({ horizontal: 16, vertical: 12 }),
      submitLabel('send'),
      glassEffect({ shape: 'capsule' }),
    ],
    []
  );

  const handleSubmit = React.useCallback(
    (text: string) => {
      if (!text.trim()) {
        return;
      }
      onSubmit?.(text);
      textFieldRef.current?.setText('');
    },
    [onSubmit]
  );

  const isKeyboardOpen = keyboardHeight > 0;
  const bottomOffset = isKeyboardOpen
    ? keyboardHeight + 4
    : insets.bottom + 4;

  return (
    <View
      pointerEvents="box-none"
      style={{
        alignItems: 'center',
        bottom: bottomOffset,
        flexDirection: 'row',
        gap: 10,
        left: 12,
        position: 'absolute',
        right: 12,
        zIndex: 100,
      }}>
      {/* Left: circular tab button — hidden when keyboard is open */}
      {onTabButtonPress && !isKeyboardOpen ? (
        <LiquidGlassIconButton
          accessibilityLabel="切换 Tab"
          fallbackIcon={<GitGraph color={theme.colors.text} size={20} strokeWidth={1.8} />}
          onPress={onTabButtonPress}
          swiftSystemImage="point.3.connected.trianglepath.dotted"
          testID="learning-glass-tab-button"
        />
      ) : null}

      {/* Right: glass text field */}
      <View style={{ flex: 1, height: INPUT_BAR_HEIGHT }}>
        {canUseGlass ? (
          <Host style={{ flex: 1, height: INPUT_BAR_HEIGHT }}>
            <TextField
              ref={textFieldRef}
              modifiers={textFieldModifiers}
              onChangeText={onChangeText}
              onSubmit={handleSubmit}
              placeholder={placeholder}
            />
          </Host>
        ) : (
          <View
            style={{
              backgroundColor: theme.colors.glassTint,
              borderColor: theme.colors.borderSoft,
              borderRadius: 999,
              borderWidth: 1,
              flex: 1,
              height: INPUT_BAR_HEIGHT,
              justifyContent: 'center',
              paddingHorizontal: 16,
            }}
          />
        )}
      </View>
    </View>
  );
}
