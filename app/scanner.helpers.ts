export type ScanGuardState = {
  blockedUntil: number;
  isConnecting: boolean;
  lastBlockedValue: string | null;
};

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
