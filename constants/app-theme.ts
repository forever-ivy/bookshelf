import { Platform } from 'react-native';

const systemFontFamily =
  Platform.select({
    android: 'sans-serif',
    default: 'System',
    ios: 'System',
  }) ?? 'System';

export const appTheme = {
  colors: {
    accentApricot: '#EDE7DE',
    accentCoral: '#EAE3DB',
    accentLavender: '#EEF1F5',
    accentMint: '#E7ECE7',
    availabilityPickup: '#2563EB',
    availabilityPickupSoft: '#DBEAFE',
    availabilityReady: '#1F8A43',
    availabilityReadySoft: '#DCFCE7',
    availabilityUnavailable: '#B45309',
    availabilityUnavailableSoft: '#FEF3C7',
    background: '#F7F6F3',
    backgroundStrong: '#F1F0EC',
    backgroundTask: '#F7F6F3',
    backgroundWorkspace: '#F5F4F1',
    borderSoft: 'rgba(25, 23, 20, 0.08)',
    borderStrong: 'rgba(25, 23, 20, 0.14)',
    glassTint: 'rgba(255,255,255,0.78)',
    iconInk: '#6F6A61',
    iconSurface: '#ECEAE5',
    iconSurfaceStrong: '#E7E4DE',
    knowledgeSoft: '#F3F5F7',
    knowledgeStrong: '#4E6379',
    knowledgeTint: 'rgba(78, 99, 121, 0.08)',
    markerHighlightBlue: '#9FD4F6',
    markerHighlightGreen: '#B7E3A1',
    markerHighlightOrange: '#F6BE7A',
    markerHighlightRed: '#F2A1A8',
    markerHighlightYellow: '#D7A61E',
    inkBlue: '#4E6379',
    primary: '#64748B',
    primarySoft: '#E9EEF3',
    primaryStrong: '#4E6379',
    success: '#4D6758',
    successSoft: '#EAF0EB',
    surface: '#FFFFFF',
    surfaceDiscovery: '#FFFFFF',
    surfaceKnowledge: '#FAFAF8',
    surfaceMuted: '#F1F0EC',
    surfaceStrong: '#FCFBF8',
    surfaceTask: '#FFFFFF',
    surfaceTint: 'rgba(255, 255, 255, 0.92)',
    systemBlue: '#007AFF',
    text: '#1F1E1B',
    textMuted: '#666258',
    textSoft: '#8C877D',
    warning: '#8B6442',
    warningSoft: '#F3EEE7',
  },
  radii: {
    lg: 18,
    md: 14,
    pill: 999,
    sm: 10,
    xl: 24,
  },
  shadows: {
    card: '0 1px 2px rgba(25, 23, 20, 0.05)',
    float: '0 4px 12px rgba(25, 23, 20, 0.08)',
  },
  spacing: {
    lg: 16,
    md: 12,
    sm: 8,
    xl: 24,
    xs: 4,
    xxl: 32,
    xxxl: 40,
  },
  typography: {
    body: {
      fontFamily: systemFontFamily,
      fontWeight: '400' as const,
    },
    bold: {
      fontFamily: systemFontFamily,
      fontWeight: '700' as const,
    },
    heading: {
      fontFamily: systemFontFamily,
      fontWeight: '600' as const,
    },
    medium: {
      fontFamily: systemFontFamily,
      fontWeight: '500' as const,
    },
    semiBold: {
      fontFamily: systemFontFamily,
      fontWeight: '600' as const,
    },
  },
} as const;

export type AppTheme = typeof appTheme;
