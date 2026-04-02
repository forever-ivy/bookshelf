import { useRouter } from 'expo-router';
import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, labelStyle } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { GlassSurface } from '@/components/base/glass-surface';
import { useAppTheme } from '@/hooks/use-app-theme';

type SecondaryBackButtonProps = {
  glassVisible?: boolean;
  label?: string;
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
}: SecondaryBackButtonProps) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const buttonModifiers = React.useMemo(
    () => [buttonStyle('glass'), controlSize('extraLarge'), labelStyle('iconOnly')],
    []
  );
  const canUseSwiftButton = supportsSwiftUiGlassButton();

  const sharedWrapperStyle = {
    alignSelf: 'flex-start' as const,
    opacity: glassVisible ? 1 : 0,
  };

  if (!canUseSwiftButton) {
    return (
      <View
        pointerEvents={glassVisible ? 'auto' : 'none'}
        style={sharedWrapperStyle}
        testID="secondary-back-button">
        <View testID="secondary-back-button-fallback">
          <GlassSurface
            interactive
            style={{
              alignItems: 'center',
              borderRadius: theme.radii.pill,
              height: 58,
              justifyContent: 'center',
              width: 58,
            }}
            tintColor={theme.colors.glassTint}>
            <Pressable
              accessibilityLabel={label}
              accessibilityRole="button"
              onPress={() => router.back()}
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
      style={sharedWrapperStyle}
      testID="secondary-back-button">
      <Host matchContents style={{ alignSelf: 'flex-start' }} testID="secondary-back-button-host">
        <Button
          label={label}
          modifiers={buttonModifiers}
          onPress={() => router.back()}
          systemImage="chevron.backward"
          testID="secondary-back-button-swift"
        />
      </Host>
    </View>
  );
}
