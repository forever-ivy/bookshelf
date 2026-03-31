import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';

const mockBack = jest.fn();
const originalPlatformOS = Platform.OS;
const originalPlatformVersion = Platform.Version;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

describe('SecondaryBackButton', () => {
  beforeEach(() => {
    mockBack.mockReset();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 26,
    });
  });

  afterAll(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatformOS,
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: originalPlatformVersion,
    });
  });

  it('uses the swift-ui glass button on iOS 26 and above', () => {
    render(<SecondaryBackButton />);

    expect(screen.getByTestId('secondary-back-button-host')).toBeTruthy();
    expect(screen.getByTestId('secondary-back-button-swift')).toBeTruthy();
    expect(screen.queryByTestId('secondary-back-button-fallback')).toBeNull();
  });

  it('falls back to the cross-platform button on Android', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    render(<SecondaryBackButton />);

    expect(screen.getByTestId('secondary-back-button-fallback')).toBeTruthy();
    expect(screen.queryByTestId('secondary-back-button-host')).toBeNull();
  });

  it('falls back to the cross-platform button on older iOS versions', () => {
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 18,
    });

    render(<SecondaryBackButton />);

    expect(screen.getByTestId('secondary-back-button-fallback')).toBeTruthy();
    expect(screen.queryByTestId('secondary-back-button-host')).toBeNull();
  });

  it('still triggers router.back when the fallback button is pressed', () => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    render(<SecondaryBackButton />);

    fireEvent.press(screen.getByTestId('secondary-back-button-fallback-pressable'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
