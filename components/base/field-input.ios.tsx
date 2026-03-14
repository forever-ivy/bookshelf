import { Host, TextField, type TextFieldRef } from '@expo/ui/swift-ui';
import { controlSize, frame, textFieldStyle } from '@expo/ui/swift-ui/modifiers';
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
  placeholder,
  style,
  value,
  ...props
}: FieldInputProps) {
  const { theme } = useBookleafTheme();
  const textFieldRef = React.useRef<TextFieldRef>(null);

  React.useEffect(() => {
    if (typeof value === 'string') {
      textFieldRef.current?.setText(value).catch(() => null);
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
        <TextField
          autoFocus={props.autoFocus}
          autocorrection={props.autoCorrect}
          defaultValue={typeof value === 'string' ? value : undefined}
          keyboardType={props.keyboardType as never}
          multiline={multiline}
          numberOfLines={multiline ? 4 : undefined}
          onChangeText={onChangeText}
          placeholder={placeholder}
          ref={textFieldRef}
          modifiers={[
            textFieldStyle('roundedBorder'),
            controlSize(multiline ? 'regular' : 'large'),
            frame({ maxWidth: 9999 }),
          ]}
        />
      </Host>
    </View>
  );
}
