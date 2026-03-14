import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { bookleafTheme } from '@/constants/bookleaf-theme';

export type GlassActionButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
};

export function GlassActionButton({
  disabled = false,
  label,
  loading = false,
  onPress,
  variant = 'primary',
}: GlassActionButtonProps) {
  const isPrimary = variant === 'primary';
  const effectiveDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        busy: loading || undefined,
        disabled: effectiveDisabled,
      }}
      disabled={effectiveDisabled}
      onPress={onPress}
      style={{
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: isPrimary ? bookleafTheme.colors.primaryStrong : bookleafTheme.colors.surface,
        borderColor: bookleafTheme.colors.border,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.pill,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: isPrimary ? 56 : 46,
        opacity: effectiveDisabled ? 0.7 : 1,
        paddingHorizontal: 18,
      }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: loading ? 10 : 0 }}>
        {loading ? (
          <ActivityIndicator color={isPrimary ? '#FFFFFF' : bookleafTheme.colors.textSoft} />
        ) : null}
        <Text
          style={{
            color: isPrimary ? '#FFFFFF' : bookleafTheme.colors.text,
            ...bookleafTheme.typography.bold,
            fontSize: isPrimary ? 16 : 14,
          }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
