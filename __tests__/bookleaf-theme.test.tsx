import React from 'react';
import { render } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

import {
  bookleafDarkTheme,
  bookleafLightTheme,
  resolveBookleafTheme,
} from '@/constants/bookleaf-theme';

describe('bookleaf theme system', () => {
  const useColorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme');

  function loadThemeHook() {
    let useBookleafTheme: typeof import('@/hooks/use-bookleaf-theme').useBookleafTheme;

    jest.isolateModules(() => {
      useBookleafTheme = require('@/hooks/use-bookleaf-theme').useBookleafTheme;
    });

    return useBookleafTheme!;
  }

  afterEach(() => {
    useColorSchemeSpy.mockReset();
  });

  it('exports distinct light and dark themes', () => {
    expect(bookleafLightTheme.colors.background).not.toBe(
      bookleafDarkTheme.colors.background
    );
    expect(bookleafLightTheme.glass.tint).not.toBe(bookleafDarkTheme.glass.tint);
    expect(bookleafLightTheme.heroBubbles.home.primary.fill).not.toBe(
      bookleafDarkTheme.heroBubbles.home.primary.fill
    );
  });

  it('resolves dark tokens when the color scheme is dark', () => {
    const theme = resolveBookleafTheme('dark');

    expect(theme.colors.background).toBe(bookleafDarkTheme.colors.background);
    expect(theme.isDark).toBe(true);
  });

  it('returns the active theme from the shared hook', () => {
    useColorSchemeSpy.mockReturnValue('dark');
    const useBookleafTheme = loadThemeHook();

    function ThemeProbe() {
      const { colorScheme, isDark, theme } = useBookleafTheme();

      return (
        <ReactNative.Text testID="theme-probe">
          {JSON.stringify({
            background: theme.colors.background,
            colorScheme,
            isDark,
          })}
        </ReactNative.Text>
      );
    }

    const screen = render(<ThemeProbe />);

    expect(screen.getByTestId('theme-probe').props.children).toContain(
      `"background":"${bookleafDarkTheme.colors.background}"`
    );
    expect(screen.getByTestId('theme-probe').props.children).toContain(
      '"colorScheme":"dark"'
    );
    expect(screen.getByTestId('theme-probe').props.children).toContain('"isDark":true');
  });
});
