export function resolveBookEtaLabel({
  deliveryAvailable,
  etaLabel,
  etaMinutes,
}: {
  deliveryAvailable?: boolean | null;
  etaLabel?: string | null;
  etaMinutes?: number | null;
}) {
  return resolveBookEtaDisplay(
    deliveryAvailable === true || (typeof etaMinutes === 'number' && Number.isFinite(etaMinutes))
      ? '可送达'
      : etaLabel
  );
}

export function resolveBookDeliveryAvailable({
  deliveryAvailable,
  etaLabel,
  etaMinutes,
}: {
  deliveryAvailable?: boolean | null;
  etaLabel?: string | null;
  etaMinutes?: number | null;
}) {
  if (typeof deliveryAvailable === 'boolean') {
    return deliveryAvailable;
  }

  const normalizedEtaLabel = etaLabel?.trim();
  const hasEtaMinutes = typeof etaMinutes === 'number' && Number.isFinite(etaMinutes);

  if (hasEtaMinutes) {
    return true;
  }

  if (normalizedEtaLabel) {
    return !normalizedEtaLabel.includes('自取');
  }

  return false;
}

export function resolveBookEtaDisplay(etaLabel?: string | null) {
  const normalizedEtaLabel = etaLabel?.trim();

  if (!normalizedEtaLabel) {
    return '到柜自取';
  }

  if (normalizedEtaLabel.includes('自取')) {
    return '到柜自取';
  }

  return '可送达';
}
