import { Platform } from 'react-native';

const systemFontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontWeights = {
  body: '400',
  medium: '500',
  semiBold: '600',
  heading: '600',
  bold: '700',
} as const;

export const bookleafTheme = {
  colors: {
    background: '#F6F3EE',
    surface: '#FFFDFC',
    surfaceMuted: '#EEF4FF',
    surfaceSoft: '#F0F4EF',
    border: 'rgba(148, 163, 184, 0.22)',
    cardBorder: 'rgba(255,255,255,0.55)',
    text: '#172033',
    textMuted: '#64748B',
    textSoft: '#94A3B8',
    primary: '#9EC3FF',
    primaryStrong: '#7FA8FF',
    primaryText: '#0F172A',
    accentGreen: '#34D399',
    glassTintNeutral: 'rgba(255,255,255,0.22)',
    glassTintClear: 'rgba(255,255,255,0.12)',
    glassForeground: '#5F6F8D',
    glassForegroundActive: '#182236',
    glassAccentSoft: 'rgba(189,208,244,0.28)',
    glassBorder: 'rgba(255,255,255,0.28)',
    navTint: '#A0B3D8',
    navGlass: 'rgba(255,255,255,0.72)',
    shadow: 'rgba(15, 23, 42, 0.12)',
  },
  radii: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  shadows: {
    soft: '0 16px 40px rgba(15, 23, 42, 0.08)',
    card: '0 22px 44px rgba(15, 23, 42, 0.08)',
    floating: '0 24px 54px rgba(15, 23, 42, 0.18)',
    primary: '0 14px 24px rgba(126, 168, 255, 0.36)',
  },
  fonts: {
    heading: systemFontFamily,
    body: systemFontFamily,
    medium: systemFontFamily,
    semiBold: systemFontFamily,
    bold: systemFontFamily,
  },
  typography: {
    heading: {
      fontFamily: systemFontFamily,
      fontWeight: fontWeights.heading,
    },
    body: {
      fontFamily: systemFontFamily,
      fontWeight: fontWeights.body,
    },
    medium: {
      fontFamily: systemFontFamily,
      fontWeight: fontWeights.medium,
    },
    semiBold: {
      fontFamily: systemFontFamily,
      fontWeight: fontWeights.semiBold,
    },
    bold: {
      fontFamily: systemFontFamily,
      fontWeight: fontWeights.bold,
    },
  },
} as const;

export type BookleafTheme = typeof bookleafTheme;
