type PerformCabinetDisconnectOptions = {
  clearQueries: () => void;
  clearSession: () => void;
};

export function performCabinetDisconnect({
  clearQueries,
  clearSession,
}: PerformCabinetDisconnectOptions) {
  clearQueries();
  clearSession();
}
