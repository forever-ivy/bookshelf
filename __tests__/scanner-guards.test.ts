import { shouldSkipScannedCode } from '@/lib/presentation/scanner-helpers';

describe('shouldSkipScannedCode', () => {
  it('blocks repeated scans while verification is already running', () => {
    expect(
      shouldSkipScannedCode(
        {
          blockedUntil: 0,
          isConnecting: true,
          lastBlockedValue: null,
        },
        'https://cabinet.example.com',
        1000
      )
    ).toBe(true);
  });

  it('blocks the same QR during the cooldown window after a failure', () => {
    expect(
      shouldSkipScannedCode(
        {
          blockedUntil: 4000,
          isConnecting: false,
          lastBlockedValue: 'https://cabinet.example.com',
        },
        'https://cabinet.example.com',
        2500
      )
    ).toBe(true);
  });

  it('allows a new QR value after a failed attempt', () => {
    expect(
      shouldSkipScannedCode(
        {
          blockedUntil: 4000,
          isConnecting: false,
          lastBlockedValue: 'https://cabinet.example.com',
        },
        'https://other.example.com',
        2500
      )
    ).toBe(false);
  });
});
