import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { GlassSurface } from '@/components/base/glass-surface';
import { useAppTheme } from '@/hooks/use-app-theme';

type SecondaryBackButtonProps = {
  label?: string;
};

export function SecondaryBackButton({
  label = '返回一级',
}: SecondaryBackButtonProps) {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => router.back()}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        opacity: pressed ? 0.94 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
      testID="secondary-back-button">
      <GlassSurface
        intensity="regular"
        style={{
          borderRadius: 999,
          boxShadow: theme.shadows.float,
        }}
        tintColor="rgba(255,255,255,0.72)">
        <View
          style={{
            alignItems: 'center',
            height: 46,
            justifyContent: 'center',
            width: 46,
          }}>
          <View
            style={{
              transform: [{ rotate: '180deg' }],
            }}>
            <AppIcon color={theme.colors.text} name="chevronRight" size={18} />
          </View>
        </View>
      </GlassSurface>
    </Pressable>
  );
}
