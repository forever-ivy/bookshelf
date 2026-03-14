import React from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { bookleafTheme } from '@/constants/bookleaf-theme';

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
  return (
    <View style={{ gap: 8 }}>
      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.semiBold,
            fontSize: 15,
          }}>
          {label}
        </Text>
        {hint ? (
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.textMuted,
              ...bookleafTheme.typography.body,
              fontSize: 12,
              lineHeight: 18,
            }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <TextInput
        multiline={multiline}
        placeholderTextColor={bookleafTheme.colors.textSoft}
        style={[
          {
            backgroundColor: bookleafTheme.colors.surface,
            borderColor: bookleafTheme.colors.border,
            borderCurve: 'continuous',
            borderRadius: bookleafTheme.radii.md,
            borderWidth: 1,
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.medium,
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
