import React from 'react';
import { render } from '@testing-library/react-native';

import { HeroBubbleBackground } from '@/components/background/hero-bubble-background';

describe('HeroBubbleBackground', () => {
  it('uses a blue, blush, and apricot palette for the home hero bubbles', () => {
    const screen = render(<HeroBubbleBackground variant="home" />);

    expect(screen.getByTestId('hero-bubble-home-primary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(138, 188, 255, 0.26)',
      })
    );
    expect(screen.getByTestId('hero-bubble-home-secondary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 214, 228, 0.34)',
      })
    );
    expect(screen.getByTestId('hero-bubble-home-tertiary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 233, 210, 0.28)',
      })
    );
  });

  it('keeps settings playful but slightly calmer than home', () => {
    const screen = render(<HeroBubbleBackground variant="settings" />);

    expect(screen.getByTestId('hero-bubble-settings-primary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(138, 188, 255, 0.22)',
      })
    );
    expect(screen.getByTestId('hero-bubble-settings-secondary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 220, 232, 0.28)',
      })
    );
    expect(screen.getByTestId('hero-bubble-settings-tertiary').props.style).toEqual(
      expect.objectContaining({
        backgroundColor: 'rgba(255, 236, 216, 0.24)',
      })
    );
  });
});
