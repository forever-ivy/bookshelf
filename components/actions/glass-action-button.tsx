/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';

export type GlassActionButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
};

const GlassActionButtonImplementation: React.ComponentType<GlassActionButtonProps> =
  process.env.EXPO_OS === 'android'
    ? require('./glass-action-button.android.tsx').GlassActionButton
    : process.env.EXPO_OS === 'web'
      ? require('./glass-action-button.web.tsx').GlassActionButton
      : require('./glass-action-button.ios.tsx').GlassActionButton;

export function GlassActionButton(props: GlassActionButtonProps) {
  return <GlassActionButtonImplementation {...props} />;
}
