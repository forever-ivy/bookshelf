import React from 'react';

import { Input, type InputProps } from 'heroui-native/input';

import { useAppTheme } from '@/hooks/use-app-theme';

export function AuthInput(props: InputProps) {
  const { theme } = useAppTheme();

  return (
    <Input
      className="text-base"
      placeholderTextColor="rgba(31, 30, 27, 0.42)"
      selectionColor={theme.colors.primaryStrong}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.48)',
        borderColor: 'rgba(31, 30, 27, 0.10)',
        borderRadius: 28,
        borderWidth: 1,
        color: theme.colors.text,
        fontSize: 16,
        minHeight: 58,
        paddingHorizontal: 22,
      }}
      {...props}
    />
  );
}
