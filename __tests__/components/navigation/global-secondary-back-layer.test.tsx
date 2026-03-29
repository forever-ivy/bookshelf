import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Animated } from 'react-native';

import {
  GlobalSecondaryBackLayer,
  shouldShowSecondaryBackButton,
} from '@/components/navigation/global-secondary-back-layer';

let mockPathname = '/profile';
const mockBack = jest.fn();

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
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows on secondary routes and stays mounted briefly after returning to a primary route', () => {
    const { rerender } = render(<GlobalSecondaryBackLayer />);

    expect(screen.getByTestId('secondary-back-layer')).toBeTruthy();
    expect(screen.getByTestId('secondary-back-button')).toBeTruthy();

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

    fireEvent.press(screen.getByTestId('secondary-back-button'));

    expect(mockBack).toHaveBeenCalledTimes(1);
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
    expect(shouldShowSecondaryBackButton('/borrowing')).toBe(false);
    expect(shouldShowSecondaryBackButton('/me')).toBe(false);
    expect(shouldShowSecondaryBackButton('/login')).toBe(false);
    expect(shouldShowSecondaryBackButton('/profile')).toBe(true);
    expect(shouldShowSecondaryBackButton('/books/42')).toBe(true);
    expect(shouldShowSecondaryBackButton('/onboarding/profile')).toBe(true);
  });
});
