import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

export type GlassActionButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
};

function withAlpha(color: string, alpha: number) {
  if (!color.startsWith('#')) {
    return color;
  }

  const normalized = color.replace('#', '');
  const safeHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((value) => `${value}${value}`)
          .join('')
      : normalized;
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function GlassActionButton({
  disabled: disabledProp = false,
  label,
  loading = false,
  onPress,
  variant = 'primary',
}: GlassActionButtonProps) {
  const supportsLiquidGlass = isLiquidGlassAvailable();
  const { theme } = useBookleafTheme();
  const isPrimary = variant === 'primary';
  const effectiveDisabled = disabledProp || loading;
  const minHeight = isPrimary ? 56 : 46;
  const foregroundColor = isPrimary
    ? theme.colors.primaryText
    : effectiveDisabled
      ? theme.colors.textSoft
      : theme.colors.text;

  const liquidGlassTintBase = isPrimary
    ? withAlpha(theme.colors.primaryStrong, 0.82)
    : theme.glass.tint;
  const liquidGlassTintPressed = isPrimary
    ? withAlpha(theme.colors.primaryStrong, 0.9)
    : theme.colors.glassTintNeutral;
  const liquidGlassTintDisabled = isPrimary
    ? withAlpha(theme.colors.primaryStrong, 0.25)
    : theme.colors.glassTintClear;
  const liquidGlassTint = effectiveDisabled ? liquidGlassTintDisabled : liquidGlassTintBase;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        busy: loading || undefined,
        disabled: effectiveDisabled,
      }}
      disabled={effectiveDisabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        alignSelf: 'stretch',
        backgroundColor: supportsLiquidGlass
          ? theme.glass.background
          : isPrimary
            ? theme.colors.primaryStrong
            : theme.colors.surface,
        borderColor: supportsLiquidGlass ? theme.glass.border : theme.colors.border,
        borderCurve: 'continuous',
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight,
        overflow: 'hidden',
        paddingHorizontal: 18,
        width: '100%',
        ...(supportsLiquidGlass ? { boxShadow: theme.glass.shadow } : null),
        ...(supportsLiquidGlass
          ? null
          : {
              opacity: effectiveDisabled ? 0.7 : 1,
            }),
        ...(pressed && !effectiveDisabled ? { transform: [{ scale: 0.99 }] } : null),
      })}
      testID={supportsLiquidGlass ? 'glass-action-button-native-host' : 'glass-action-button-shell'}>
      {({ pressed }) => (
        <>
          {supportsLiquidGlass ? (
            <GlassView
              colorScheme={theme.glass.colorScheme}
              glassEffectStyle={isPrimary ? 'regular' : 'clear'}
              isInteractive={false}
              style={StyleSheet.absoluteFill}
              testID="glass-action-button-glass"
              tintColor={
                effectiveDisabled
                  ? liquidGlassTintDisabled
                  : pressed
                    ? liquidGlassTintPressed
                    : liquidGlassTint
              }
            />
          ) : null}
          {supportsLiquidGlass && pressed && !effectiveDisabled ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: isPrimary
                    ? withAlpha(theme.colors.primaryStrong, 0.18)
                    : theme.colors.glassTintClear,
                },
              ]}
            />
          ) : null}
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: loading ? 10 : 0 }}>
            {loading ? (
              <ActivityIndicator color={foregroundColor} testID="glass-action-button-spinner" />
            ) : null}
            <Text
              style={{
                color: foregroundColor,
                ...theme.typography.bold,
                fontSize: isPrimary ? 16 : 14,
              }}>
              {label}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}
