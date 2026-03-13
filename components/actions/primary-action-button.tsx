import React from 'react';

import { GlassActionButton } from '@/components/actions/glass-action-button';

type PrimaryActionButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
};

export function PrimaryActionButton({
  disabled = false,
  label,
  loading = false,
  onPress,
  variant = 'primary',
}: PrimaryActionButtonProps) {
  return (
    <GlassActionButton
      disabled={disabled}
      label={label}
      loading={loading}
      onPress={onPress}
      variant={variant}
    />
  );
}
