import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, labelStyle } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { GlassSurface } from '@/components/base/glass-surface';
import { useAppTheme } from '@/hooks/use-app-theme';

const FLOATING_BUTTON_SIZE = 58;

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

export function LiquidGlassIconButton({
  accessibilityLabel,
  fallbackIcon,
  onPress,
  swiftSystemImage,
  testID,
}: {
  accessibilityLabel: string;
  fallbackIcon: React.ReactNode;
  onPress: () => void;
  swiftSystemImage: string;
  testID: string;
}) {
  const { theme } = useAppTheme();
  const buttonModifiers = React.useMemo(
    () => [buttonStyle('glass'), controlSize('extraLarge'), labelStyle('iconOnly')],
    []
  );
  const canUseSwiftButton = supportsSwiftUiGlassButton();

  if (!canUseSwiftButton) {
    return (
      <View
        style={{
          alignSelf: 'flex-start',
          borderRadius: theme.radii.pill,
          height: FLOATING_BUTTON_SIZE,
          overflow: 'hidden',
          width: FLOATING_BUTTON_SIZE,
        }}
        testID={testID}>
        <View testID={`${testID}-fallback`}>
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
              accessibilityLabel={accessibilityLabel}
              accessibilityRole="button"
              onPress={onPress}
              style={{
                alignItems: 'center',
                borderRadius: theme.radii.pill,
                height: '100%',
                justifyContent: 'center',
                width: '100%',
              }}
              testID={`${testID}-fallback-pressable`}>
              {fallbackIcon}
            </Pressable>
          </GlassSurface>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        height: FLOATING_BUTTON_SIZE,
        justifyContent: 'center',
        width: FLOATING_BUTTON_SIZE,
      }}
      testID={testID}>
      <Host
        style={{ height: FLOATING_BUTTON_SIZE, width: FLOATING_BUTTON_SIZE }}
        testID={`${testID}-host`}>
        <Button
          label={accessibilityLabel}
          modifiers={buttonModifiers}
          onPress={onPress}
          systemImage={swiftSystemImage}
          testID={`${testID}-swift`}
        />
      </Host>
    </View>
  );
}
