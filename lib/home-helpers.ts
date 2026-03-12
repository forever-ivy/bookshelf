import type { CabinetCompartment, CabinetStatusSummary } from '@/lib/api/types';

const locationLabelMap: Record<string, string> = {
  'Living Room': '客厅',
  'Preview Cabinet': '预览书柜',
};

function localizeLocationLabel(locationLabel: string) {
  return locationLabelMap[locationLabel] ?? locationLabel;
}

export function buildCabinetStatusSummary(
  compartments: CabinetCompartment[],
  locationLabel: string
): CabinetStatusSummary {
  const usedCompartments = compartments.filter(
    (compartment) => compartment.status !== 'free'
  ).length;
  const totalBooks = compartments.filter((compartment) => Boolean(compartment.book)).length;

  return {
    connectedLabel: '书柜已连接',
    locationLabel: localizeLocationLabel(locationLabel),
    totalCompartments: compartments.length,
    usedCompartments,
    availableCompartments: Math.max(compartments.length - usedCompartments, 0),
    totalBooks,
  };
}

export function getTimeBasedGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return '早上好';
  }

  return '晚上好';
}
