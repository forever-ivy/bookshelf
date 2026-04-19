import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, labelStyle } from '@expo/ui/swift-ui/modifiers';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { GlassSurface } from '@/components/base/glass-surface';
import { useAppTheme } from '@/hooks/use-app-theme';

const FLOATING_BUTTON_SIZE = 58;

type SecondaryBackButtonProps = {
  glassVisible?: boolean;
  label?: string;
  onPress?: () => void;
  testID?: string;
  variant?: 'floating' | 'inline';
};

function supportsSwiftUiGlassButton() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  const majorVersion =
    typeof Platform.Version === 'string'
      ? Number.parseInt(Platform.Version, 10)
      : Platform.Version;

  return Number.isFinite(majorVersion) && Number(majorVersion) >= 26;
}

export function SecondaryBackButton({
  glassVisible = true,
  label = '返回一级',
  onPress,
  testID = 'secondary-back-button',
  variant = 'floating',
}: SecondaryBackButtonProps) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const buttonModifiers = React.useMemo(
    () => [buttonStyle('glass'), controlSize('extraLarge'), labelStyle('iconOnly')],
    []
  );
  const canUseSwiftButton = supportsSwiftUiGlassButton();
  const handlePress = onPress ?? (() => router.back());

  if (variant === 'inline') {
    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        onPress={handlePress}
        style={({ pressed }) => ({
          alignItems: 'center',
          borderRadius: theme.radii.pill,
          height: 44,
          justifyContent: 'center',
          marginLeft: -8,
          opacity: pressed ? 0.72 : 1,
          width: 44,
        })}
        testID={testID}>
        <AppIcon color={theme.colors.text} name="chevronLeft" size={22} strokeWidth={2.05} />
      </Pressable>
    );
  }

  const sharedWrapperStyle = {
    alignSelf: 'flex-start' as const,
    opacity: glassVisible ? 1 : 0,
    height: FLOATING_BUTTON_SIZE,
    width: FLOATING_BUTTON_SIZE,
  };

  if (!canUseSwiftButton) {
    return (
      <View
        pointerEvents={glassVisible ? 'auto' : 'none'}
        style={sharedWrapperStyle}
        testID={testID}>
        <View testID="secondary-back-button-fallback">
          <GlassSurface
            interactive
            style={{
              alignItems: 'center',
              borderRadius: theme.radii.pill,
              height: FLOATING_BUTTON_SIZE,
              justifyContent: 'center',
              width: FLOATING_BUTTON_SIZE,
            }}
            tintColor="rgba(255,255,255,0.72)">
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              onPress={handlePress}
              style={{
                alignItems: 'center',
                borderRadius: theme.radii.pill,
                height: '100%',
                justifyContent: 'center',
                width: '100%',
              }}
              testID="secondary-back-button-fallback-pressable">
              <AppIcon color={theme.colors.text} name="chevronLeft" size={22} strokeWidth={2.05} />
            </Pressable>
          </GlassSurface>
        </View>
      </View>
    );
  }

  return (
    <View
      pointerEvents={glassVisible ? 'auto' : 'none'}
      style={[sharedWrapperStyle, { alignItems: 'center', justifyContent: 'center' }]}
      testID={testID}>
      <Host
        style={{ height: FLOATING_BUTTON_SIZE, width: FLOATING_BUTTON_SIZE }}
        testID="secondary-back-button-host">
        <Button
          label={label}
          modifiers={buttonModifiers}
          onPress={handlePress}
          systemImage="chevron.backward"
          testID="secondary-back-button-swift"
        />
      </Host>
    </View>
  );
}
