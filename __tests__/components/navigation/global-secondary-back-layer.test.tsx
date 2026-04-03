import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Animated, Platform } from 'react-native';

import {
  GlobalSecondaryBackLayer,
  shouldShowSecondaryBackButton,
} from '@/components/navigation/global-secondary-back-layer';

let mockPathname = '/profile';
const mockBack = jest.fn();
const originalPlatformOS = Platform.OS;
const originalPlatformVersion = Platform.Version;

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

describe('GlobalSecondaryBackLayer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockBack.mockReset();
    mockPathname = '/profile';
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios',
    });
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: 26,
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
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

  it('shows on secondary routes and stays mounted briefly after returning to a primary route', () => {
    const { rerender } = render(<GlobalSecondaryBackLayer />);

    expect(screen.getByTestId('secondary-back-layer')).toBeTruthy();
    expect(screen.queryByTestId('toolbar-header-row')).toBeNull();
    expect(screen.getByTestId('secondary-back-button')).toBeTruthy();
    expect(screen.getByTestId('secondary-back-layer').props.style.top).toBe(34);

    mockPathname = '/';
    rerender(<GlobalSecondaryBackLayer />);

    expect(screen.getByTestId('secondary-back-layer')).toBeTruthy();

    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByTestId('secondary-back-layer')).toBeNull();
  });

  it('triggers router.back when pressed', () => {
    render(<GlobalSecondaryBackLayer />);

    fireEvent.press(screen.getByTestId('secondary-back-button-swift'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to the floating glass back button on untitled secondary routes', () => {
    mockPathname = '/me';

    const { rerender } = render(<GlobalSecondaryBackLayer />);

    expect(screen.queryByTestId('secondary-back-ambient-blur')).toBeNull();
    expect(screen.queryByTestId('secondary-back-ambient-glass')).toBeNull();
    expect(screen.queryByTestId('toolbar-header-row')).toBeNull();
    expect(screen.getByTestId('secondary-back-button-host')).toBeTruthy();
    expect(screen.getByTestId('secondary-back-button-swift')).toBeTruthy();
    expect(screen.getByText('chevron.backward')).toBeTruthy();

    mockPathname = '/';
    rerender(<GlobalSecondaryBackLayer />);

    expect(screen.getByTestId('secondary-back-button-host')).toBeTruthy();
  });

  it('uses a grow-then-shrink exit animation when returning to a primary route', () => {
    const sequenceSpy = jest.spyOn(Animated, 'sequence');
    const timingSpy = jest.spyOn(Animated, 'timing');
    const { rerender } = render(<GlobalSecondaryBackLayer />);

    mockPathname = '/';
    rerender(<GlobalSecondaryBackLayer />);

    expect(sequenceSpy).toHaveBeenCalled();
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1.06 })
    );
    expect(timingSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 0.32 })
    );

    sequenceSpy.mockRestore();
    timingSpy.mockRestore();
  });

  it('only shows on non-primary routes', () => {
    expect(shouldShowSecondaryBackButton('/')).toBe(false);
    expect(shouldShowSecondaryBackButton('/search')).toBe(false);
    expect(shouldShowSecondaryBackButton('/search/borrow-now')).toBe(true);
    expect(shouldShowSecondaryBackButton('/borrowing')).toBe(false);
    expect(shouldShowSecondaryBackButton('/me')).toBe(true);
    expect(shouldShowSecondaryBackButton('/login')).toBe(false);
    expect(shouldShowSecondaryBackButton('/profile')).toBe(true);
    expect(shouldShowSecondaryBackButton('/books/42')).toBe(true);
    expect(shouldShowSecondaryBackButton('/onboarding/profile')).toBe(true);
  });

  it('does not render a secondary title inside the back layer', () => {
    mockPathname = '/books/42';

    render(<GlobalSecondaryBackLayer />);

    expect(screen.queryByText('图书详情')).toBeNull();
  });
});
