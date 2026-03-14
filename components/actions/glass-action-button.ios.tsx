import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

export type GlassActionButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
};

export function GlassActionButton({
  disabled: disabledProp = false,
  label,
  loading = false,
  onPress,
  variant = 'primary',
}: GlassActionButtonProps) {
  const { theme } = useBookleafTheme();
  const isPrimary = variant === 'primary';
  const effectiveDisabled = disabledProp || loading;
  const foregroundColor = effectiveDisabled
    ? theme.colors.textSoft
    : isPrimary
      ? theme.colors.primaryText
      : theme.colors.text;

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
        backgroundColor: isPrimary ? theme.colors.primaryStrong : theme.colors.surface,
        borderColor: theme.colors.border,
        borderCurve: 'continuous',
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: isPrimary ? 56 : 46,
        opacity: effectiveDisabled ? 0.7 : 1,
        paddingHorizontal: 18,
      }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: loading ? 10 : 0 }}>
        {loading ? <ActivityIndicator color={foregroundColor} /> : null}
        <Text
          style={{
            color: foregroundColor,
            ...theme.typography.bold,
            fontSize: isPrimary ? 16 : 14,
          }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
