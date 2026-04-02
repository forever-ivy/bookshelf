import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, labelStyle } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { GlassSurface } from '@/components/base/glass-surface';
import { useAppTheme } from '@/hooks/use-app-theme';

type ProfileSheetTriggerButtonProps = {
  label?: string;
  onPress: () => void;
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

export function ProfileSheetTriggerButton({
  label = '打开个人中心',
  onPress,
}: ProfileSheetTriggerButtonProps) {
  const { theme } = useAppTheme();
  const buttonModifiers = React.useMemo(
    () => [buttonStyle('glass'), controlSize('extraLarge'), labelStyle('iconOnly')],
    []
  );
  const canUseSwiftButton = supportsSwiftUiGlassButton();

  if (!canUseSwiftButton) {
    return (
      <View style={{ alignSelf: 'flex-start' }} testID="profile-sheet-trigger">
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
            onPress={onPress}
            style={{
              alignItems: 'center',
              borderRadius: theme.radii.pill,
              height: '100%',
              justifyContent: 'center',
              width: '100%',
            }}
            testID="profile-sheet-trigger-fallback-pressable">
            <AppIcon color={theme.colors.text} name="profile" size={22} strokeWidth={2.05} />
          </Pressable>
        </GlassSurface>
      </View>
    );
  }

  return (
    <View style={{ alignSelf: 'flex-start' }} testID="profile-sheet-trigger">
      <Host matchContents style={{ alignSelf: 'flex-start' }} testID="profile-sheet-trigger-host">
        <Button
          label={label}
          modifiers={buttonModifiers}
          onPress={onPress}
          systemImage="person.crop.circle.fill"
          testID="profile-sheet-trigger-swift"
        />
      </Host>
    </View>
  );
}
