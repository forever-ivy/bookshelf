import {
  appStackScreenOptions,
  profileScreenOptions,
  rootStackScreenOptions,
  scannerScreenOptions,
} from '@/lib/app/navigation-transitions';

describe('navigation transitions', () => {
  it('uses direct transitions for root and primary app stacks', () => {
    expect(rootStackScreenOptions.animation).toBe('none');
    expect(appStackScreenOptions.animation).toBe('none');
  });

  it('restores the native push and pop transition for profile detail routes', () => {
    expect(profileScreenOptions.animation).toBe('default');
  });

  it('keeps scanner as a full screen modal from the bottom', () => {
    expect(scannerScreenOptions.animation).toBe('slide_from_bottom');
    expect(scannerScreenOptions.presentation).toBe('fullScreenModal');
  });
});
