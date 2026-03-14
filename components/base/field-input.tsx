/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import type { TextInputProps } from 'react-native';

type FieldInputProps = TextInputProps & {
  hint?: string;
  label: string;
};

const FieldInputImplementation: React.ComponentType<FieldInputProps> =
  process.env.EXPO_OS === 'android'
    ? require('./field-input.android.tsx').FieldInput
    : process.env.EXPO_OS === 'web'
      ? require('./field-input.web.tsx').FieldInput
      : require('./field-input.ios.tsx').FieldInput;

export function FieldInput(props: FieldInputProps) {
  return <FieldInputImplementation {...props} />;
}
