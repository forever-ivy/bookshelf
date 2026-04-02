import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { appThemes } from '@/constants/app-theme';
import { StateMessageCard } from '@/components/base/state-message-card';

const mockUseAppTheme = jest.fn(() => ({
  colorScheme: 'dark' as const,
  isDark: true,
  theme: appThemes.dark,
}));

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => mockUseAppTheme(),
}));

describe('StateMessageCard', () => {
  beforeEach(() => {
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'dark',
      isDark: true,
      theme: appThemes.dark,
    });
  });

  it('uses semantic danger colors from the active theme instead of light hardcoded values', () => {
    render(
      <StateMessageCard
        description="后端返回了 500"
        testID="danger-card"
        title="联调失败"
        tone="danger"
      />
    );

    expect(screen.getByTestId('danger-card')).toHaveStyle({
      backgroundColor: appThemes.dark.colors.dangerSoft,
      borderColor: appThemes.dark.colors.dangerBorder,
    });
    expect(screen.getByText('联调失败')).toHaveStyle({
      color: appThemes.dark.colors.danger,
    });
  });
});
