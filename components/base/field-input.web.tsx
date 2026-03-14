import React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

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
      <TextInput
        multiline={multiline}
        placeholderTextColor={theme.colors.textSoft}
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderCurve: 'continuous',
            borderRadius: theme.radii.md,
            borderWidth: 1,
            color: theme.colors.text,
            ...theme.typography.medium,
            fontSize: 15,
            minHeight: multiline ? 112 : 56,
            paddingHorizontal: 16,
            paddingVertical: multiline ? 14 : 0,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...props}
      />
    </View>
  );
}
