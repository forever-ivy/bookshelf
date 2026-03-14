/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';

export type GlassPillButtonProps = {
  icon: 'back' | 'info' | 'search' | 'share';
  label?: string;
  onPress: () => void;
};

const GlassPillButtonImplementation: React.ComponentType<GlassPillButtonProps> =
  process.env.EXPO_OS === 'android'
    ? require('./glass-pill-button.android.tsx').GlassPillButton
    : process.env.EXPO_OS === 'web'
      ? require('./glass-pill-button.web.tsx').GlassPillButton
      : require('./glass-pill-button.ios.tsx').GlassPillButton;

export function GlassPillButton(props: GlassPillButtonProps) {
  return <GlassPillButtonImplementation {...props} />;
}
