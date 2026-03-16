export type ScanGuardState = {
  blockedUntil: number;
  isConnecting: boolean;
  lastBlockedValue: string | null;
};

export function parseCabinetScanPayload(scannedValue: string) {
  try {
    const url = new URL(scannedValue);
    const bindUrl =
      !url.search && (url.pathname === '/' || !url.pathname)
        ? `${url.protocol}//${url.host}`
        : url.toString();

    return {
      baseUrl: `${url.protocol}//${url.host}`,
      bindUrl,
      pairCode: url.searchParams.get('pair_code'),
    };
  } catch {
    return null;
  }
}

export function shouldSkipScannedCode(
  state: ScanGuardState,
  scannedValue: string,
  now = Date.now()
) {
  if (state.isConnecting) {
    return true;
  }

  return state.lastBlockedValue === scannedValue && now < state.blockedUntil;
}
