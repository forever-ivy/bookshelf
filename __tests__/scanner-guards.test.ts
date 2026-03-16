import {
  parseCabinetScanPayload,
  shouldSkipScannedCode,
} from '@/lib/presentation/scanner-helpers';

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

  it('extracts the base cabinet url and pair code from the new bind qr payload', () => {
    expect(
      parseCabinetScanPayload('https://cabinet.example.com/bind?pair_code=pair-123')
    ).toEqual({
      baseUrl: 'https://cabinet.example.com',
      bindUrl: 'https://cabinet.example.com/bind?pair_code=pair-123',
      pairCode: 'pair-123',
    });
  });

  it('falls back to the raw cabinet origin when a dev qr only contains the base url', () => {
    expect(parseCabinetScanPayload('https://cabinet.example.com')).toEqual({
      baseUrl: 'https://cabinet.example.com',
      bindUrl: 'https://cabinet.example.com',
      pairCode: null,
    });
  });

  it('returns null for invalid scan payloads', () => {
    expect(parseCabinetScanPayload('not-a-url')).toBeNull();
  });
});
