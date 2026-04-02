import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { appThemes } from '@/constants/app-theme';
import { DueStateChip } from '@/components/borrowing/due-state-chip';

const mockUseAppTheme = jest.fn(() => ({
  colorScheme: 'dark' as const,
  isDark: true,
  theme: appThemes.dark,
}));

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => mockUseAppTheme(),
}));

describe('DueStateChip', () => {
  beforeEach(() => {
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'dark',
      isDark: true,
      theme: appThemes.dark,
    });
  });

  it('uses a vivid green palette for completed state', () => {
    render(<DueStateChip state="completed" />);

    expect(screen.getByText('已完成')).toHaveStyle({
      color: appThemes.dark.colors.availabilityReady,
    });
  });

  it('keeps overdue palette readable in dark mode', () => {
    render(<DueStateChip state="overdue" />);

    expect(screen.getByText('已逾期')).toHaveStyle({
      color: appThemes.dark.colors.warning,
    });
    expect(screen.getByTestId('due-state-chip')).toHaveStyle({
      backgroundColor: appThemes.dark.colors.warningSoft,
    });
  });
});
