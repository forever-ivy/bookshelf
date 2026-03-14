import React from 'react';
import { render } from '@testing-library/react-native';
import * as ReactNative from 'react-native';

describe('HeroBubbleBackground', () => {
  const useColorSchemeSpy = jest.spyOn(ReactNative, 'useColorScheme');

  function loadHeroBubbleBackground() {
    let HeroBubbleBackground: typeof import('@/components/background/hero-bubble-background').HeroBubbleBackground;

    jest.isolateModules(() => {
      HeroBubbleBackground = require('@/components/background/hero-bubble-background').HeroBubbleBackground;
    });

    return HeroBubbleBackground!;
  }

  afterEach(() => {
    useColorSchemeSpy.mockReset();
  });

  it('uses a stronger blue, blush, and apricot palette for the home bubbles in light mode', () => {
    useColorSchemeSpy.mockReturnValue('light');
    const HeroBubbleBackground = loadHeroBubbleBackground();
    const screen = render(<HeroBubbleBackground variant="home" />);

    expect(screen.getByTestId('hero-bubble-home-primary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(118, 175, 255, 0.32)',
      })
    );
    expect(screen.getByTestId('hero-bubble-home-secondary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 206, 226, 0.4)',
      })
    );
    expect(screen.getByTestId('hero-bubble-home-tertiary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 225, 194, 0.34)',
      })
    );
  });

  it('keeps settings playful but slightly calmer than home in light mode', () => {
    useColorSchemeSpy.mockReturnValue('light');
    const HeroBubbleBackground = loadHeroBubbleBackground();
    const screen = render(<HeroBubbleBackground variant="settings" />);

    expect(screen.getByTestId('hero-bubble-settings-primary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(118, 175, 255, 0.28)',
      })
    );
    expect(screen.getByTestId('hero-bubble-settings-secondary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 210, 228, 0.34)',
      })
    );
    expect(screen.getByTestId('hero-bubble-settings-tertiary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 228, 204, 0.28)',
      })
    );
  });

  it('switches to a darker low-glare palette in dark mode', () => {
    useColorSchemeSpy.mockReturnValue('dark');
    const HeroBubbleBackground = loadHeroBubbleBackground();
    const screen = render(<HeroBubbleBackground variant="home" />);

    expect(screen.getByTestId('hero-bubble-home-primary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(78, 126, 214, 0.28)',
      })
    );
    expect(screen.getByTestId('hero-bubble-home-secondary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(214, 105, 154, 0.18)',
      })
    );
    expect(screen.getByTestId('hero-bubble-home-tertiary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 170, 102, 0.14)',
      })
    );
  });
});
