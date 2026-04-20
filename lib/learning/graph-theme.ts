import type { AppTheme } from '@/constants/app-theme';
import type { LearningGraphRuntimeTheme } from '@/lib/learning/graph-bridge';

function withAlpha(hexColor: string, alpha: number) {
  const normalized = hexColor.replace('#', '').trim();
  if (normalized.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function buildLearningGraphRuntimeTheme(theme: AppTheme): LearningGraphRuntimeTheme {
  return {
    background: theme.colors.backgroundWorkspace,
    borderSoft: theme.colors.borderSoft,
    edge: withAlpha(theme.colors.availabilityPickup, 0.22),
    explore: theme.colors.markerHighlightOrange,
    fragment: theme.colors.markerHighlightRed,
    primary: theme.colors.availabilityPickup,
    source: theme.colors.markerHighlightGreen,
    step: theme.colors.markerHighlightYellow,
    success: theme.colors.availabilityReady,
    surface: theme.colors.surface,
    text: theme.colors.text,
    textSoft: theme.colors.textSoft,
    warning: theme.colors.markerHighlightYellow,
  };
}
