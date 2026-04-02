import { useTheme } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { appThemes } from '@/constants/app-theme';
import { AppProviders } from '@/providers/app-providers';

const mockSetBackgroundColorAsync = jest.fn(async () => undefined);
const mockUseAppTheme = jest.fn(() => ({
  colorScheme: 'light' as const,
  isDark: false,
  theme: appThemes.light,
}));

jest.mock('@/hooks/use-app-theme', () => ({
  useAppTheme: () => mockUseAppTheme(),
}));

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: (...args: unknown[]) => mockSetBackgroundColorAsync(...args),
}));

function NavigationThemeProbe() {
  const theme = useTheme();

  return <Text>{`${theme.colors.background}|${theme.colors.card}`}</Text>;
}

describe('AppProviders', () => {
  beforeEach(() => {
    mockSetBackgroundColorAsync.mockClear();
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'light',
      isDark: false,
      theme: appThemes.light,
    });
  });

  it('renders children inside the provider tree', () => {
    render(
      <AppProviders>
        <Text>foundation-ready</Text>
      </AppProviders>
    );

    expect(screen.getByText('foundation-ready')).toBeTruthy();
  });

  it('provides a navigation theme aligned with the app background', () => {
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'dark',
      isDark: true,
      theme: appThemes.dark,
    });

    render(
      <AppProviders>
        <NavigationThemeProbe />
      </AppProviders>
    );

    expect(
      screen.getByText(`${appThemes.dark.colors.background}|${appThemes.dark.colors.background}`)
    ).toBeTruthy();
  });

  it('syncs the native system background with the resolved dark theme', () => {
    mockUseAppTheme.mockReturnValue({
      colorScheme: 'dark',
      isDark: true,
      theme: appThemes.dark,
    });

    render(
      <AppProviders>
        <Text>dark-ready</Text>
      </AppProviders>
    );

    expect(mockSetBackgroundColorAsync).toHaveBeenCalledWith(appThemes.dark.colors.background);
  });
});
