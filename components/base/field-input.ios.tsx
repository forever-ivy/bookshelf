import React from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type FieldInputProps = TextInputProps & {
  hint?: string;
  label: string;
};

export function FieldInput({
  hint,
  label,
  multiline = false,
  style,
  ...props
}: FieldInputProps) {
  const { theme } = useBookleafTheme();
  const supportsLiquidGlass = isLiquidGlassAvailable();

  return (
    <View style={{ gap: 8 }}>
      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 15,
          }}>
          {label}
        </Text>
        {hint ? (
          <Text
            selectable
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 12,
              lineHeight: 18,
            }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          backgroundColor: supportsLiquidGlass ? theme.glass.background : theme.colors.surface,
          borderColor: supportsLiquidGlass ? theme.glass.border : theme.colors.border,
          borderCurve: 'continuous',
          borderRadius: theme.radii.md,
          borderWidth: 1,
          minHeight: multiline ? 120 : 56,
          overflow: 'hidden',
          position: 'relative',
          ...(supportsLiquidGlass ? { boxShadow: theme.glass.shadow } : null),
        }}>
        {supportsLiquidGlass ? (
          <GlassView
            colorScheme={theme.glass.colorScheme}
            glassEffectStyle="clear"
            isInteractive={false}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            testID="field-input-glass"
            tintColor={theme.colors.glassTintClear}
          />
        ) : null}
        <TextInput
          multiline={multiline}
          placeholderTextColor={theme.colors.textSoft}
          style={[
            {
              color: theme.colors.text,
              ...theme.typography.medium,
              fontSize: 15,
              minHeight: multiline ? 120 : 56,
              paddingHorizontal: 16,
              paddingVertical: multiline ? 14 : 0,
              textAlignVertical: multiline ? 'top' : 'center',
              width: '100%',
            },
            style,
          ]}
          {...props}
        />
      </View>
    </View>
  );
}
