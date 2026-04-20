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

/**
 * Boost color saturation for the 3D graph context.
 * Converts hex → HSL, multiplies saturation, clamps, converts back.
 */
function vivifyHex(hexColor: string, satBoost = 1.3, lightShift = 0): string {
  const normalized = hexColor.replace('#', '').trim();
  if (normalized.length !== 6) {
    return hexColor;
  }

  let r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  let g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  let b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  let s = 0;
  let l = (max + min) / 2;

  if (delta > 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / delta + 2) / 6;
    else h = ((r - g) / delta + 4) / 6;
  }

  s = Math.min(1, s * satBoost);
  l = Math.min(1, Math.max(0, l + lightShift));

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  r = hue2rgb(p, q, h + 1 / 3);
  g = hue2rgb(p, q, h);
  b = hue2rgb(p, q, h - 1 / 3);

  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function buildLearningGraphRuntimeTheme(theme: AppTheme): LearningGraphRuntimeTheme {
  return {
    background: theme.colors.backgroundWorkspace,
    borderSoft: theme.colors.borderSoft,
    edge: withAlpha(theme.colors.availabilityPickup, 0.3),
    explore: vivifyHex(theme.colors.markerHighlightOrange, 1.4, 0.02),
    fragment: vivifyHex(theme.colors.markerHighlightRed, 1.4, 0.02),
    primary: vivifyHex(theme.colors.availabilityPickup, 1.35, 0.03),
    source: vivifyHex(theme.colors.markerHighlightGreen, 1.35, 0.02),
    step: vivifyHex(theme.colors.markerHighlightYellow, 1.3, 0.02),
    success: vivifyHex(theme.colors.availabilityReady, 1.3),
    surface: theme.colors.surface,
    text: theme.colors.text,
    textSoft: theme.colors.textSoft,
    warning: vivifyHex(theme.colors.markerHighlightYellow, 1.3),
  };
}
