import { Host, TextInput, type TextInputRef } from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import React from 'react';
import { Text, type TextInputProps, View } from 'react-native';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type FieldInputProps = TextInputProps & {
  hint?: string;
  label: string;
};

export function FieldInput({
  hint,
  label,
  multiline = false,
  onChangeText,
  style,
  value,
  ...props
}: FieldInputProps) {
  const { theme } = useBookleafTheme();
  const textInputRef = React.useRef<TextInputRef>(null);

  React.useEffect(() => {
    if (typeof value === 'string') {
      textInputRef.current?.setText(value).catch(() => null);
    }
  }, [value]);

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
      <Host style={style as never}>
        <TextInput
          autoCapitalize={props.autoCapitalize}
          autocorrection={props.autoCorrect}
          defaultValue={typeof value === 'string' ? value : undefined}
          keyboardType={props.keyboardType as never}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
          onChangeText={(nextValue) => onChangeText?.(nextValue)}
          ref={textInputRef}
          modifiers={[fillMaxWidth()]}
        />
      </Host>
      {props.placeholder ? (
        <Text
          selectable
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.body,
            fontSize: 12,
          }}>
          {props.placeholder}
        </Text>
      ) : null}
    </View>
  );
}
