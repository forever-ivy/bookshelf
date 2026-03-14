import {
  Platform,
  type ColorSchemeName,
} from 'react-native';

const systemFontFamily =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }) ?? 'System';

const fontWeights = {
  body: '400',
  medium: '500',
  semiBold: '600',
  heading: '600',
  bold: '700',
} as const;

const radii = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

const fonts = {
  body: systemFontFamily,
  bold: systemFontFamily,
  heading: systemFontFamily,
  medium: systemFontFamily,
  semiBold: systemFontFamily,
} as const;

const typography = {
  body: {
    fontFamily: systemFontFamily,
    fontWeight: fontWeights.body,
  },
  bold: {
    fontFamily: systemFontFamily,
    fontWeight: fontWeights.bold,
  },
  heading: {
    fontFamily: systemFontFamily,
    fontWeight: fontWeights.heading,
  },
  medium: {
    fontFamily: systemFontFamily,
    fontWeight: fontWeights.medium,
  },
  semiBold: {
    fontFamily: systemFontFamily,
    fontWeight: fontWeights.semiBold,
  },
} as const;

const sharedThemeTokens = {
  fonts,
  radii,
  spacing,
  typography,
} as const;

type BubbleTone = {
  border: string;
  fill: string;
  shadow?: string;
};

type ThemeDefinition = {
  colors: {
    accentGreen: string;
    accentGreenSurface: string;
    accentGreenText: string;
    background: string;
    border: string;
    borderStrong: string;
    cardBorder: string;
    errorIcon: string;
    errorSurface: string;
    errorText: string;
    glassAccentSoft: string;
    glassBorder: string;
    glassForeground: string;
    glassForegroundActive: string;
    glassTintClear: string;
    glassTintNeutral: string;
    inputBorder: string;
    inputSurface: string;
    modalScrim: string;
    navGlass: string;
    navTint: string;
    overlaySurface: string;
    primary: string;
    primaryStrong: string;
    primaryText: string;
    scannerBase: string;
    scannerFrame: string;
    scannerPanel: string;
    scannerPanelBorder: string;
    scannerPanelBorderStrong: string;
    scannerPanelSubtle: string;
    scannerRetry: string;
    scannerText: string;
    scannerTextMuted: string;
    scannerTextSoft: string;
    shadow: string;
    successIcon: string;
    successSurface: string;
    successText: string;
    surface: string;
    surfaceElevated: string;
    surfaceMuted: string;
    surfaceSoft: string;
    text: string;
    textInverse: string;
    textMuted: string;
    textSoft: string;
    warningIcon: string;
    warningSurface: string;
    warningText: string;
    white: string;
  };
  connectionBadge: {
    background: string;
    icon: string;
    text: string;
  };
  glass: {
    background: string;
    border: string;
    colorScheme: 'dark' | 'light';
    shadow: string;
    tint: string;
  };
  heroBubbles: {
    home: {
      primary: BubbleTone;
      secondary: BubbleTone;
      tertiary: BubbleTone;
    };
    settings: {
      primary: BubbleTone;
      secondary: BubbleTone;
      tertiary: BubbleTone;
    };
  };
  milestone: {
    buttonBackground: string;
    buttonText: string;
    cardBackground: string;
    cardBorder: string;
    haloInner: string;
    haloOuter: string;
    haloOuterBorder: string;
    haloOuterShadow: string;
    modalBackground: string;
    modalBorder: string;
    modalScrim: string;
  };
  nav: {
    background: string;
    iconDefault: string;
    iconSelected: string;
    labelDefault: string;
    labelSelected: string;
  };
  shadows: {
    card: string;
    floating: string;
    primary: string;
    soft: string;
  };
  states: {
    error: {
      background: string;
      description: string;
      icon: string;
      title: string;
    };
    neutral: {
      background: string;
      description: string;
      icon: string;
      title: string;
    };
    success: {
      background: string;
      description: string;
      icon: string;
      title: string;
    };
    warning: {
      background: string;
      description: string;
      icon: string;
      title: string;
    };
  };
  statusBarStyle: 'dark' | 'light';
  topOverlay: {
    blurHeight: number;
    blurIntensity: number;
    gradientColor: string;
    gradientOpacities: readonly number[];
    height: number;
  };
  goalProgress: {
    cardBackground: string;
    ctaBackground: string;
    ctaBorder: string;
    track: string;
  };
};

function createTheme(definition: ThemeDefinition) {
  return {
    ...sharedThemeTokens,
    ...definition,
    isDark: definition.statusBarStyle === 'light',
  } as const;
}

export const bookleafLightTheme = createTheme({
  colors: {
    accentGreen: '#34D399',
    accentGreenSurface: '#D7F5E1',
    accentGreenText: '#0F5132',
    background: '#F6F3EE',
    border: 'rgba(148, 163, 184, 0.22)',
    borderStrong: 'rgba(148, 163, 184, 0.32)',
    cardBorder: 'rgba(255,255,255,0.55)',
    errorIcon: '#991B1B',
    errorSurface: '#FEE2E2',
    errorText: '#7F1D1D',
    glassAccentSoft: 'rgba(189,208,244,0.28)',
    glassBorder: 'rgba(255,255,255,0.28)',
    glassForeground: '#5F6F8D',
    glassForegroundActive: '#182236',
    glassTintClear: 'rgba(255,255,255,0.12)',
    glassTintNeutral: 'rgba(255,255,255,0.22)',
    inputBorder: 'rgba(158,195,255,0.24)',
    inputSurface: 'rgba(255,255,255,0.86)',
    modalScrim: 'rgba(0,0,0,0.6)',
    navGlass: 'rgba(255,255,255,0.72)',
    navTint: '#A0B3D8',
    overlaySurface: 'rgba(255,255,255,0.76)',
    primary: '#9EC3FF',
    primaryStrong: '#7FA8FF',
    primaryText: '#0F172A',
    scannerBase: '#10192A',
    scannerFrame: '#FFFFFF',
    scannerPanel: 'rgba(16,25,42,0.72)',
    scannerPanelBorder: 'rgba(255,255,255,0.12)',
    scannerPanelBorderStrong: 'rgba(255,255,255,0.16)',
    scannerPanelSubtle: 'rgba(16,25,42,0.62)',
    scannerRetry: 'rgba(255,255,255,0.08)',
    scannerText: '#FFFFFF',
    scannerTextMuted: 'rgba(255,255,255,0.72)',
    scannerTextSoft: 'rgba(255,255,255,0.78)',
    shadow: 'rgba(15, 23, 42, 0.12)',
    successIcon: '#166534',
    successSurface: '#DCFCE7',
    successText: '#14532D',
    surface: '#FFFDFC',
    surfaceElevated: 'rgba(255,255,255,0.82)',
    surfaceMuted: '#EEF4FF',
    surfaceSoft: '#F0F4EF',
    text: '#172033',
    textInverse: '#F8FAFC',
    textMuted: '#64748B',
    textSoft: '#94A3B8',
    warningIcon: '#92400E',
    warningSurface: '#FEF3C7',
    warningText: '#78350F',
    white: '#FFFFFF',
  },
  connectionBadge: {
    background: '#D7F5E1',
    icon: '#34D399',
    text: '#0F5132',
  },
  glass: {
    background: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.22)',
    colorScheme: 'light',
    shadow: '0 12px 30px rgba(126, 168, 255, 0.18)',
    tint: 'rgba(255,255,255,0.68)',
  },
  goalProgress: {
    cardBackground: 'rgba(238,244,255,0.92)',
    ctaBackground: 'rgba(255,255,255,0.7)',
    ctaBorder: 'rgba(255,255,255,0.55)',
    track: 'rgba(255,255,255,0.82)',
  },
  heroBubbles: {
    home: {
      primary: {
        border: 'rgba(255,255,255,0.4)',
        fill: 'rgba(118, 175, 255, 0.32)',
        shadow: '0 24px 60px rgba(110, 162, 255, 0.22)',
      },
      secondary: {
        border: 'rgba(255,255,255,0.32)',
        fill: 'rgba(255, 206, 226, 0.4)',
      },
      tertiary: {
        border: 'rgba(255,255,255,0.28)',
        fill: 'rgba(255, 225, 194, 0.34)',
      },
    },
    settings: {
      primary: {
        border: 'rgba(255,255,255,0.38)',
        fill: 'rgba(118, 175, 255, 0.28)',
        shadow: '0 22px 54px rgba(110, 162, 255, 0.18)',
      },
      secondary: {
        border: 'rgba(255,255,255,0.3)',
        fill: 'rgba(255, 210, 228, 0.34)',
      },
      tertiary: {
        border: 'rgba(255,255,255,0.26)',
        fill: 'rgba(255, 228, 204, 0.28)',
      },
    },
  },
  milestone: {
    buttonBackground: '#9EC3FF',
    buttonText: '#FFFFFF',
    cardBackground: 'rgba(238,244,255,0.84)',
    cardBorder: 'rgba(255,255,255,0.72)',
    haloInner: 'rgba(255,255,255,0.94)',
    haloOuter: 'rgba(255, 230, 170, 0.92)',
    haloOuterBorder: 'rgba(255,255,255,0.9)',
    haloOuterShadow: '0 10px 24px rgba(255, 228, 160, 0.42)',
    modalBackground: 'rgba(238,244,255,0.98)',
    modalBorder: 'rgba(255,255,255,0.9)',
    modalScrim: 'rgba(0, 0, 0, 0.6)',
  },
  nav: {
    background: '#FFFDFC',
    iconDefault: '#94A3B8',
    iconSelected: '#7FA8FF',
    labelDefault: '#94A3B8',
    labelSelected: '#7FA8FF',
  },
  shadows: {
    card: '0 22px 44px rgba(15, 23, 42, 0.08)',
    floating: '0 24px 54px rgba(15, 23, 42, 0.18)',
    primary: '0 14px 24px rgba(126, 168, 255, 0.36)',
    soft: '0 16px 40px rgba(15, 23, 42, 0.08)',
  },
  states: {
    error: {
      background: '#FEE2E2',
      description: '#7F1D1D',
      icon: '#991B1B',
      title: '#7F1D1D',
    },
    neutral: {
      background: 'rgba(240,244,239,0.92)',
      description: '#64748B',
      icon: '#64748B',
      title: '#172033',
    },
    success: {
      background: '#DCFCE7',
      description: '#14532D',
      icon: '#166534',
      title: '#14532D',
    },
    warning: {
      background: '#FEF3C7',
      description: '#78350F',
      icon: '#92400E',
      title: '#78350F',
    },
  },
  statusBarStyle: 'dark',
  topOverlay: {
    blurHeight: 56,
    blurIntensity: 18,
    gradientColor: '#F6F3EE',
    gradientOpacities: [0.12, 0.07, 0.025, 0],
    height: 108,
  },
});

export const bookleafDarkTheme = createTheme({
  colors: {
    accentGreen: '#5FE1AE',
    accentGreenSurface: 'rgba(36,104,74,0.32)',
    accentGreenText: '#C6F7DD',
    background: '#0F1522',
    border: 'rgba(148, 163, 184, 0.18)',
    borderStrong: 'rgba(148, 163, 184, 0.28)',
    cardBorder: 'rgba(255,255,255,0.08)',
    errorIcon: '#F2A5A5',
    errorSurface: 'rgba(158,55,55,0.22)',
    errorText: '#F6CACA',
    glassAccentSoft: 'rgba(98,130,199,0.22)',
    glassBorder: 'rgba(255,255,255,0.12)',
    glassForeground: '#D5E1F6',
    glassForegroundActive: '#FFFFFF',
    glassTintClear: 'rgba(18,28,44,0.2)',
    glassTintNeutral: 'rgba(18,28,44,0.34)',
    inputBorder: 'rgba(108,140,199,0.34)',
    inputSurface: 'rgba(18,28,44,0.9)',
    modalScrim: 'rgba(0,0,0,0.72)',
    navGlass: 'rgba(18,28,44,0.86)',
    navTint: '#8092B4',
    overlaySurface: 'rgba(21,29,46,0.82)',
    primary: '#6E9BFF',
    primaryStrong: '#84AFFF',
    primaryText: '#08111F',
    scannerBase: '#08101C',
    scannerFrame: 'rgba(255,255,255,0.92)',
    scannerPanel: 'rgba(8,16,28,0.78)',
    scannerPanelBorder: 'rgba(255,255,255,0.08)',
    scannerPanelBorderStrong: 'rgba(255,255,255,0.14)',
    scannerPanelSubtle: 'rgba(8,16,28,0.66)',
    scannerRetry: 'rgba(255,255,255,0.06)',
    scannerText: '#F8FAFC',
    scannerTextMuted: 'rgba(255,255,255,0.7)',
    scannerTextSoft: 'rgba(255,255,255,0.82)',
    shadow: 'rgba(3, 8, 20, 0.48)',
    successIcon: '#8EE2B5',
    successSurface: 'rgba(32,104,70,0.24)',
    successText: '#C6F7DD',
    surface: '#161E2D',
    surfaceElevated: 'rgba(21,29,46,0.92)',
    surfaceMuted: '#1A2740',
    surfaceSoft: '#14201C',
    text: '#F3F6FC',
    textInverse: '#0F172A',
    textMuted: '#A9B6CC',
    textSoft: '#7B8CA7',
    warningIcon: '#F7C873',
    warningSurface: 'rgba(146,101,33,0.24)',
    warningText: '#FDE6A8',
    white: '#FFFFFF',
  },
  connectionBadge: {
    background: 'rgba(36,104,74,0.32)',
    icon: '#5FE1AE',
    text: '#C6F7DD',
  },
  glass: {
    background: 'rgba(18,28,44,0.38)',
    border: 'rgba(255,255,255,0.12)',
    colorScheme: 'dark',
    shadow: '0 14px 28px rgba(3, 8, 20, 0.4)',
    tint: 'rgba(18,28,44,0.76)',
  },
  goalProgress: {
    cardBackground: 'rgba(26,39,64,0.92)',
    ctaBackground: 'rgba(255,255,255,0.06)',
    ctaBorder: 'rgba(255,255,255,0.1)',
    track: 'rgba(255,255,255,0.14)',
  },
  heroBubbles: {
    home: {
      primary: {
        border: 'rgba(255,255,255,0.08)',
        fill: 'rgba(78, 126, 214, 0.28)',
        shadow: '0 24px 60px rgba(20, 36, 72, 0.28)',
      },
      secondary: {
        border: 'rgba(255,255,255,0.05)',
        fill: 'rgba(214, 105, 154, 0.18)',
      },
      tertiary: {
        border: 'rgba(255,255,255,0.04)',
        fill: 'rgba(255, 170, 102, 0.14)',
      },
    },
    settings: {
      primary: {
        border: 'rgba(255,255,255,0.08)',
        fill: 'rgba(78, 126, 214, 0.24)',
        shadow: '0 22px 54px rgba(20, 36, 72, 0.24)',
      },
      secondary: {
        border: 'rgba(255,255,255,0.05)',
        fill: 'rgba(196, 104, 150, 0.14)',
      },
      tertiary: {
        border: 'rgba(255,255,255,0.04)',
        fill: 'rgba(242, 166, 108, 0.11)',
      },
    },
  },
  milestone: {
    buttonBackground: '#6E9BFF',
    buttonText: '#F8FAFC',
    cardBackground: 'rgba(26,39,64,0.84)',
    cardBorder: 'rgba(255,255,255,0.08)',
    haloInner: 'rgba(20,31,48,0.92)',
    haloOuter: 'rgba(209, 166, 86, 0.3)',
    haloOuterBorder: 'rgba(255,255,255,0.1)',
    haloOuterShadow: '0 10px 24px rgba(141, 108, 46, 0.26)',
    modalBackground: 'rgba(22,31,48,0.98)',
    modalBorder: 'rgba(255,255,255,0.08)',
    modalScrim: 'rgba(0, 0, 0, 0.72)',
  },
  nav: {
    background: '#161E2D',
    iconDefault: '#7B8CA7',
    iconSelected: '#84AFFF',
    labelDefault: '#7B8CA7',
    labelSelected: '#84AFFF',
  },
  shadows: {
    card: '0 20px 42px rgba(3, 8, 20, 0.34)',
    floating: '0 24px 54px rgba(3, 8, 20, 0.48)',
    primary: '0 14px 28px rgba(85, 124, 214, 0.32)',
    soft: '0 14px 34px rgba(3, 8, 20, 0.28)',
  },
  states: {
    error: {
      background: 'rgba(158,55,55,0.22)',
      description: '#F6CACA',
      icon: '#F2A5A5',
      title: '#F6CACA',
    },
    neutral: {
      background: 'rgba(20,32,54,0.92)',
      description: '#A9B6CC',
      icon: '#A9B6CC',
      title: '#F3F6FC',
    },
    success: {
      background: 'rgba(32,104,70,0.24)',
      description: '#C6F7DD',
      icon: '#8EE2B5',
      title: '#C6F7DD',
    },
    warning: {
      background: 'rgba(146,101,33,0.24)',
      description: '#FDE6A8',
      icon: '#F7C873',
      title: '#FDE6A8',
    },
  },
  statusBarStyle: 'light',
  topOverlay: {
    blurHeight: 56,
    blurIntensity: 22,
    gradientColor: '#0F1522',
    gradientOpacities: [0.18, 0.11, 0.045, 0],
    height: 108,
  },
});

export type BookleafTheme = typeof bookleafLightTheme;
export type BookleafColorScheme = 'dark' | 'light';

export function normalizeBookleafColorScheme(
  colorScheme?: ColorSchemeName
): BookleafColorScheme {
  return colorScheme === 'dark' ? 'dark' : 'light';
}

export function resolveBookleafTheme(colorScheme?: ColorSchemeName) {
  return normalizeBookleafColorScheme(colorScheme) === 'dark'
    ? bookleafDarkTheme
    : bookleafLightTheme;
}

export const bookleafTheme = bookleafLightTheme;
