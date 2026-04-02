import { useTheme } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { appTheme } from '@/constants/app-theme';
import { AppProviders } from '@/providers/app-providers';

function NavigationThemeProbe() {
  const theme = useTheme();

  return <Text>{`${theme.colors.background}|${theme.colors.card}`}</Text>;
}

describe('AppProviders', () => {
  it('renders children inside the provider tree', () => {
    render(
      <AppProviders>
        <Text>foundation-ready</Text>
      </AppProviders>
    );

    expect(screen.getByText('foundation-ready')).toBeTruthy();
  });

  it('provides a navigation theme aligned with the app background', () => {
    render(
      <AppProviders>
        <NavigationThemeProbe />
      </AppProviders>
    );

    expect(
      screen.getByText(`${appTheme.colors.background}|${appTheme.colors.background}`)
    ).toBeTruthy();
  });
});
