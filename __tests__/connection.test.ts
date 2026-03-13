import { createConnectionProfile, normalizeBaseUrl } from '@/lib/app/connection';

describe('normalizeBaseUrl', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeBaseUrl('  http://192.168.1.20:5000/  ')).toBe('http://192.168.1.20:5000');
  });

  it('preserves a nested base path when present', () => {
    expect(normalizeBaseUrl('https://demo.example.com/api/bookshelf/')).toBe(
      'https://demo.example.com/api/bookshelf'
    );
  });
});

describe('createConnectionProfile', () => {
  it('builds a persisted profile with normalized url and timestamps', () => {
    const profile = createConnectionProfile(' https://cabinet.example.com/ ', 'Living Room');

    expect(profile.baseUrl).toBe('https://cabinet.example.com');
    expect(profile.displayName).toBe('Living Room');
    expect(profile.connectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(profile.lastVerifiedAt).toBe(profile.connectedAt);
  });
});
