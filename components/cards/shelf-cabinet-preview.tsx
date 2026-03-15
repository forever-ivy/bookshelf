import React from 'react';
import {
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
  TSpan,
} from 'react-native-svg';

import { AppIcon } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import type { CabinetCompartment } from '@/lib/api/contracts/types';

type ShelfCabinetPreviewProps = {
  compartments: CabinetCompartment[];
  onTakeBook: (compartment: CabinetCompartment) => Promise<unknown> | unknown;
  previewMode: boolean;
};

type ShelfRow = {
  compartments: CabinetCompartment[];
  rowKey: string;
  shelfIndex: number;
};

const SvgDefs = Defs as unknown as React.ComponentType<
  React.PropsWithChildren<object>
>;

type BookAppearance = {
  accent: string;
  emboss: boolean;
  glow: string;
  height: number;
  label: boolean;
  text: string;
  tint: string;
  variant: 'classic' | 'label' | 'modern';
};

const BOOK_APPEARANCES = [
  {
    accent: '#D4A96A',
    emboss: true,
    glow: 'rgba(212, 169, 106, 0.4)',
    height: 192,
    label: false,
    text: '#FFF5E6',
    tint: '#C4704A',
    variant: 'classic',
  },
  {
    accent: '#C4A882',
    emboss: false,
    glow: 'rgba(196, 168, 130, 0.4)',
    height: 174,
    label: true,
    text: '#FFF8F2',
    tint: '#8C5C72',
    variant: 'label',
  },
  {
    accent: '#B8C9A2',
    emboss: true,
    glow: 'rgba(184, 201, 162, 0.4)',
    height: 204,
    label: false,
    text: '#F2FFED',
    tint: '#5E7843',
    variant: 'classic',
  },
  {
    accent: '#C9B89A',
    emboss: false,
    glow: 'rgba(201, 184, 154, 0.4)',
    height: 180,
    label: true,
    text: '#FFF9F4',
    tint: '#9B6B4E',
    variant: 'label',
  },
  {
    accent: '#9FC4C0',
    emboss: true,
    glow: 'rgba(159, 196, 192, 0.4)',
    height: 196,
    label: false,
    text: '#EDFAFA',
    tint: '#4E7E80',
    variant: 'modern',
  },
  {
    accent: '#B8B4CC',
    emboss: true,
    glow: 'rgba(184, 180, 204, 0.4)',
    height: 186,
    label: true,
    text: '#F5F4FF',
    tint: '#6B6890',
    variant: 'modern',
  },
] as const satisfies readonly BookAppearance[];

const BOOK_STAGE_HEIGHT = 520;

function hashBookKey(input: string) {
  return Array.from(input).reduce(
    (total, char) => total + char.charCodeAt(0) * 17,
    0
  );
}

function getBookAppearance(compartment: CabinetCompartment): BookAppearance {
  const source = compartment.book ?? `slot-${compartment.cid}`;
  const hash = hashBookKey(source);

  return BOOK_APPEARANCES[hash % BOOK_APPEARANCES.length];
}

function getGroupedRows(compartments: CabinetCompartment[]): ShelfRow[] {
  const rows = new Map<number, CabinetCompartment[]>();

  compartments.forEach((compartment) => {
    const group = rows.get(compartment.y) ?? [];
    group.push(compartment);
    rows.set(compartment.y, group);
  });

  return Array.from(rows.entries())
    .sort(([a], [b]) => a - b)
    .map(([rowValue, rowCompartments], index) => ({
      compartments: [...rowCompartments].sort((left, right) => left.x - right.x),
      rowKey: `row-${rowValue}`,
      shelfIndex: index,
    }));
}

function getVerticalTitleChars(title: string | null, fallback: number) {
  const rawText = (title ?? `第${fallback}格`).replace(/\s+/g, '');
  const clipped = Array.from(rawText).slice(0, rawText.length > 10 ? 8 : 10);

  return clipped;
}

function mixHexColors(colorA: string, colorB: string, amount: number) {
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '');
    const safeHex = normalized.length === 3
      ? normalized
          .split('')
          .map((value) => `${value}${value}`)
          .join('')
      : normalized;

    return {
      b: parseInt(safeHex.slice(4, 6), 16),
      g: parseInt(safeHex.slice(2, 4), 16),
      r: parseInt(safeHex.slice(0, 2), 16),
    };
  };
  const toHex = (value: number) => clamp(Math.round(value)).toString(16).padStart(2, '0');
  const source = hexToRgb(colorA);
  const target = hexToRgb(colorB);
  const weight = Math.max(0, Math.min(1, amount));

  return `#${toHex(source.r + (target.r - source.r) * weight)}${toHex(source.g + (target.g - source.g) * weight)}${toHex(source.b + (target.b - source.b) * weight)}`;
}

function withAlpha(color: string, alpha: number) {
  if (!color.startsWith('#')) {
    return color;
  }

  const normalized = color.replace('#', '');
  const safeHex = normalized.length === 3
    ? normalized
        .split('')
        .map((value) => `${value}${value}`)
        .join('')
    : normalized;
  const r = parseInt(safeHex.slice(0, 2), 16);
  const g = parseInt(safeHex.slice(2, 4), 16);
  const b = parseInt(safeHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type BookSpineSvgProps = {
  appearance: BookAppearance;
  slotId: number;
  title: string | null;
};

function BookSpineSvg({ appearance, slotId, title }: BookSpineSvgProps) {
  const chars = getVerticalTitleChars(title, slotId);
  const tint = appearance.tint;
  const gold = appearance.accent;
  const darkEdge = mixHexColors(tint, '#000000', 0.45);
  const lightEdge = mixHexColors(tint, '#FFFFFF', 0.22);
  const midShade = mixHexColors(tint, '#000000', 0.18);
  const goldDim = mixHexColors(gold, tint, 0.36);
  const fontSize = chars.length > 6 ? 13 : 15;
  // Tighter line step for better vertical proportion
  const lineStep = chars.length > 6 ? 19 : 23;
  // Dynamically vertical-center the text block in the usable spine area
  // Usable area: y=15 (after top band) to y=245 (before bottom band) → 230px
  const H = 260;
  const W = 78;
  const SX = 4;
  const SW = W - SX * 2;
  const bandH = 14;
  const usableTop = bandH + 2;
  const usableHeight = H - bandH * 2 - 4;
  const totalTextHeight = (chars.length - 1) * lineStep + fontSize;
  const titleY = usableTop + Math.max(0, (usableHeight - totalTextHeight) / 2) + fontSize;

  return (
    <Svg height="100%" viewBox={`0 0 ${W} ${H}`} width="100%">
      <SvgDefs>
        {/* Main cylindrical body gradient — left light, right shadow */}
        <LinearGradient id={`sb-${slotId}`} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor={darkEdge} />
          <Stop offset="0.06" stopColor={lightEdge} stopOpacity="0.9" />
          <Stop offset="0.14" stopColor={tint} />
          <Stop offset="0.7" stopColor={tint} />
          <Stop offset="0.9" stopColor={midShade} />
          <Stop offset="1" stopColor={darkEdge} />
        </LinearGradient>
        {/* Top sheen — very thin bright line at top to simulate edge highlight */}
        <LinearGradient id={`st-${slotId}`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={lightEdge} stopOpacity="0.7" />
          <Stop offset="1" stopColor={tint} stopOpacity="0" />
        </LinearGradient>
        {/* Gold band gradient */}
        <LinearGradient id={`sg-${slotId}`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={mixHexColors(gold, '#FFFFFF', 0.35)} />
          <Stop offset="0.4" stopColor={gold} />
          <Stop offset="1" stopColor={goldDim} />
        </LinearGradient>
        {/* Title panel inset */}
        <LinearGradient id={`sp-${slotId}`} x1="0" x2="1" y1="0" y2="0">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.22" />
          <Stop offset="0.3" stopColor="#000000" stopOpacity="0.08" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.18" />
        </LinearGradient>
      </SvgDefs>

      {/* ─── Main spine body ─── */}
      <Rect fill={`url(#sb-${slotId})`} height={H - 4} rx="5" width={SW} x={SX} y="2" />

      {/* ─── Top sheen layer ─── */}
      <Rect fill={`url(#st-${slotId})`} height="40" rx="5" width={SW} x={SX} y="2" />

      {/* ─── Left specular highlight edge ─── */}
      <Rect
        fill={withAlpha('#FFFFFF', 0.18)}
        height={H - 8}
        rx="2"
        width="3"
        x={SX + 2}
        y="4"
      />

      {/* ─── RIGHT dark shadow edge ─── */}
      <Rect
        fill={withAlpha('#000000', 0.18)}
        height={H - 8}
        rx="2"
        width="3"
        x={SX + SW - 5}
        y="4"
      />

      {/* ─── TOP binding band ─── */}
      <Rect fill={`url(#sg-${slotId})`} height="12" rx="2" width={SW} x={SX} y="2" />
      <Rect fill={withAlpha('#FFFFFF', 0.3)} height="1.5" rx="0.75" width={SW - 4} x={SX + 2} y="2" />
      <Rect fill={withAlpha('#000000', 0.2)} height="1.5" rx="0.75" width={SW - 4} x={SX + 2} y="13" />

      {/* ─── BOTTOM binding band ─── */}
      <Rect fill={`url(#sg-${slotId})`} height="12" rx="2" width={SW} x={SX} y={H - 14} />
      <Rect fill={withAlpha('#FFFFFF', 0.3)} height="1.5" rx="0.75" width={SW - 4} x={SX + 2} y={H - 14} />
      <Rect fill={withAlpha('#000000', 0.2)} height="1.5" rx="0.75" width={SW - 4} x={SX + 2} y={H - 3} />

      {/* ─── VARIANT-SPECIFIC decorative lines ─── */}
      {appearance.variant === 'classic' ? (
        <>
          {/* Classic: thin gold rule lines above and below title */}
          <Line stroke={withAlpha(gold, 0.85)} strokeWidth="1.5" x1={SX + 4} x2={SX + SW - 4} y1="30" y2="30" />
          <Line stroke={withAlpha(gold, 0.4)} strokeWidth="0.6" x1={SX + 4} x2={SX + SW - 4} y1="33" y2="33" />
          <Line stroke={withAlpha(gold, 0.85)} strokeWidth="1.5" x1={SX + 4} x2={SX + SW - 4} y1={H - 30} y2={H - 30} />
          <Line stroke={withAlpha(gold, 0.4)} strokeWidth="0.6" x1={SX + 4} x2={SX + SW - 4} y1={H - 33} y2={H - 33} />
          <Circle cx={39} cy={36} fill={withAlpha(gold, 0.7)} r="1.8" />
          <Circle cx={39} cy={H - 36} fill={withAlpha(gold, 0.7)} r="1.8" />
        </>
      ) : null}

      {appearance.variant === 'label' ? (
        <>
          {/* Label: simple top and bottom gold accent lines */}
          <Line stroke={withAlpha(gold, 0.8)} strokeWidth="1.5" x1={SX + 6} x2={SX + SW - 6} y1="30" y2="30" />
          <Line stroke={withAlpha(gold, 0.8)} strokeWidth="1.5" x1={SX + 6} x2={SX + SW - 6} y1={H - 30} y2={H - 30} />
        </>
      ) : null}

      {appearance.variant === 'modern' ? (
        <>
          {/* Modern: single bottom accent line */}
          <Line stroke={withAlpha(gold, 0.8)} strokeWidth="1.5" x1={SX + 10} x2={SX + SW - 10} y1={H - 28} y2={H - 28} />
          <Line stroke={withAlpha(gold, 0.4)} strokeWidth="0.8" x1={SX + 10} x2={SX + SW - 10} y1={H - 31} y2={H - 31} />
        </>
      ) : null}

      {/* ─── WHITE highlight shadow text (emboss effect) ─── */}
      <SvgText
        fill={withAlpha('#FFFFFF', 0.35)}
        fontFamily="Georgia, serif"
        fontSize={fontSize}
        fontWeight="bold"
        letterSpacing="2"
        textAnchor="middle"
        x={39}
        y={titleY + 1}
      >
        {chars.map((char, index) => (
          <TSpan dy={index === 0 ? 0 : lineStep} key={`shadow-${char}-${index}`} x={39}>
            {char}
          </TSpan>
        ))}
      </SvgText>

      {/* ─── MAIN title text ─── */}
      <SvgText
        fill={appearance.variant === 'label' ? mixHexColors(tint, '#2A1A0A', 0.25) : appearance.text}
        fontFamily="Georgia, serif"
        fontSize={fontSize}
        fontWeight="bold"
        letterSpacing="2"
        textAnchor="middle"
        x={39}
        y={titleY}
      >
        {chars.map((char, index) => (
          <TSpan dy={index === 0 ? 0 : lineStep} key={`text-${char}-${index}`} x={39}>
            {char}
          </TSpan>
        ))}
      </SvgText>
    </Svg>
  );
}

function getCompartmentMeta(compartment: CabinetCompartment) {
  return `格口 ${compartment.cid} · 坐标 ${compartment.x + 1}-${compartment.y + 1}`;
}

export function ShelfCabinetPreview({
  compartments,
  onTakeBook,
  previewMode,
}: ShelfCabinetPreviewProps) {
  const { theme } = useBookleafTheme();
  const { width: windowWidth } = useWindowDimensions();
  const stageWidth = Math.min(360, Math.max(280, windowWidth - 48));
  const rows = React.useMemo(
    () => getGroupedRows(compartments),
    [compartments]
  );
  const [selectedCompartment, setSelectedCompartment] =
    React.useState<CabinetCompartment | null>(null);
  const [isClosing, setIsClosing] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewProgress = useSharedValue(0);

  React.useEffect(() => {
    if (selectedCompartment && !isClosing) {
      previewProgress.value = withTiming(1, {
        duration: 720,
        easing: Easing.bezier(0.2, 0.9, 0.2, 1),
      });
    }

    if (selectedCompartment && isClosing) {
      previewProgress.value = withTiming(0, {
        duration: 380,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }
  }, [isClosing, previewProgress, selectedCompartment]);

  React.useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    },
    []
  );

  const handleClose = React.useCallback(() => {
    if (!selectedCompartment || isClosing) {
      return;
    }

    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setSelectedCompartment(null);
      setIsClosing(false);
      setIsSubmitting(false);
    }, 390);
  }, [isClosing, selectedCompartment]);

  const handleOpen = React.useCallback((compartment: CabinetCompartment) => {
    if (compartment.status !== 'occupied') {
      return;
    }

    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }

    previewProgress.value = 0;
    setSelectedCompartment(compartment);
    setIsClosing(false);
  }, [previewProgress]);

  const handleTakeBook = React.useCallback(async () => {
    if (!selectedCompartment || previewMode || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await Promise.resolve(onTakeBook(selectedCompartment));
      handleClose();
    } catch {
      setIsSubmitting(false);
    }
  }, [handleClose, isSubmitting, onTakeBook, previewMode, selectedCompartment]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: previewProgress.value,
  }));

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1200 },
      {
        translateY: interpolate(previewProgress.value, [0, 1], [36, 0]),
      },
      {
        rotateX: `${interpolate(previewProgress.value, [0, 1], [6, 0])}deg`,
      },
      {
        scale: interpolate(previewProgress.value, [0, 1], [0.84, 1]),
      },
    ],
  }));

  const coverStyle = useAnimatedStyle(() => {
    const progress = previewProgress.value;
    const scaleX = interpolate(progress, [0, 1], [1, 0.02]);
    // Keep the left edge visually pinned while the cover collapses.
    const pinLeft = -(stageWidth * (1 - scaleX)) / 2;

    return {
      opacity: interpolate(progress, [0, 0.92, 1], [1, 1, 0]),
      transform: [
        { translateX: pinLeft },
        { translateX: interpolate(progress, [0, 1], [0, -28]) },
        { rotateZ: `${interpolate(progress, [0, 1], [0, -3])}deg` },
        { scaleX },
      ],
    };
  });

  const pageShellStyle = useAnimatedStyle(() => ({
    opacity: interpolate(previewProgress.value, [0, 0.2, 1], [0.22, 0.42, 1]),
    transform: [
      {
        translateX: interpolate(previewProgress.value, [0, 1], [18, 0]),
      },
      {
        scale: interpolate(previewProgress.value, [0, 1], [0.98, 1]),
      },
    ],
  }));

  const pageContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(previewProgress.value, [0, 0.38, 1], [0, 0, 1]),
    transform: [
      {
        translateY: interpolate(previewProgress.value, [0, 1], [14, 0]),
      },
    ],
  }));

  const selectedAppearance = selectedCompartment
    ? getBookAppearance(selectedCompartment)
    : null;

  return (
    <View style={{ gap: 22 }}>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: 36,
          borderWidth: 1,
          boxShadow: theme.shadows.card,
          overflow: 'hidden',
          paddingHorizontal: 22,
          paddingTop: 22,
          paddingBottom: 34,
        }}>
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.28)',
            borderRadius: 32,
            bottom: -24,
            boxShadow: '0 24px 60px rgba(177, 168, 153, 0.22)',
            left: 16,
            position: 'absolute',
            right: 16,
            top: 16,
          }}
        />
        <View style={{ gap: 26 }}>
          {rows.map((row) => (
            <View key={row.rowKey} style={{ gap: 0 }} testID={`shelf-row-${row.shelfIndex}`}>
              <View
                style={{
                  backgroundColor: '#ECE6DB',
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  height: 206,
                  overflow: 'hidden',
                  paddingHorizontal: 20,
                  paddingTop: 16,
                }}>
                <View
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    borderRadius: 32,
                    left: 0,
                    opacity: 0.85,
                    position: 'absolute',
                    right: 0,
                    top: -52,
                    height: 120,
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    gap: 12,
                    flex: 1,
                  }}>
                  {row.compartments.map((compartment) => {
                    const isOccupied = compartment.status === 'occupied';
                    const appearance = getBookAppearance(compartment);

                    if (!isOccupied) {
                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ disabled: true }}
                          disabled
                          key={compartment.cid}
                          style={{ flex: 1 }}
                          testID={`cabinet-slot-${compartment.cid}`}>
                          <View
                            style={{
                              alignItems: 'center',
                              backgroundColor: 'rgba(244, 248, 243, 0.9)',
                              borderColor: 'rgba(180, 198, 182, 0.45)',
                              borderCurve: 'continuous',
                              borderRadius: 24,
                              borderWidth: 1,
                              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9)',
                              gap: 10,
                              height: 122,
                              justifyContent: 'center',
                              paddingHorizontal: 10,
                            }}>
                            <View
                              style={{
                                backgroundColor: 'rgba(212, 227, 213, 0.55)',
                                borderRadius: theme.radii.pill,
                                height: 54,
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: 54,
                                
                              }}>
                              <AppIcon
                                color="rgba(104, 134, 108, 0.72)"
                                name="cabinet"
                                size={24}
                              />
                            </View>
                            <Text
                              selectable
                              style={{
                                color: theme.colors.textMuted,
                                ...theme.typography.medium,
                                fontSize: 12,
                              }}>
                              空格口
                            </Text>
                          </View>
                        </Pressable>
                      );
                    }

                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={compartment.cid}
                        onPress={() => handleOpen(compartment)}
                        style={{ alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}
                        testID={`cabinet-book-${compartment.cid}`}>
                        <View
                          style={{
                            boxShadow: '4px 5px 12px rgba(0, 0, 0, 0.12)',
                            height: appearance.height + 2,
                            marginBottom: -2,
                            overflow: 'hidden',
                            width: 68,
                          }}>
                          <BookSpineSvg
                            appearance={appearance}
                            slotId={compartment.cid}
                            title={compartment.book}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View
                style={{
                  height: 8,
                  backgroundColor: '#D4D0C7',
                  borderBottomWidth: 1,
                  borderColor: 'rgba(0,0,0,0.08)',
                  boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.06)',
                }}
              />
              <View
                style={{
                  backgroundColor: '#EEE9DE',
                  borderBottomLeftRadius: 8,
                  borderBottomRightRadius: 8,
                  boxShadow: '0 15px 24px rgba(0,0,0,0.08), inset 0 2px 3px rgba(255,255,255,0.92)',
                  height: 20,
                }}
              />
            </View>
          ))}
        </View>
      </View>

      {selectedCompartment ? (
        <Modal
          animationType="none"
          onRequestClose={handleClose}
          transparent
          visible
        >
          <Animated.View
            style={[
              {
                backgroundColor: theme.colors.modalScrim,
                bottom: 0,
                justifyContent: 'center',
                left: 0,
                padding: 24,
                position: 'absolute',
                right: 0,
                top: 0,
              },
              overlayStyle,
            ]}
            testID="shelf-preview-modal"
          >
            <Pressable
              onPress={handleClose}
              style={{
                alignItems: 'center',
                flex: 1,
                justifyContent: 'center',
              }}
            >
              <Animated.View
                style={[
                  {
                    height: BOOK_STAGE_HEIGHT,
                    position: 'relative',
                    width: stageWidth,
                  },
                  wrapperStyle,
                ]}
              >
                <Pressable
                  onPress={() => undefined}
                  style={{
                    flex: 1,
                  }}
                >
                  <View
                    style={{
                      borderCurve: 'continuous',
                      borderRadius: 18,
                      boxShadow: '10px 20px 50px rgba(0,0,0,0.15)',
                      flex: 1,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Animated.View
                      style={[
                        {
                          backgroundColor: '#FFFDF8',
                          flex: 1,
                          overflow: 'hidden',
                          padding: 28,
                        },
                        pageShellStyle,
                      ]}
                    >
                        <View
                          style={{
                            backgroundColor: '#F1ECE2',
                            bottom: 6,
                            position: 'absolute',
                            right: 0,
                            top: 6,
                            width: 5,
                          }}
                        />
                        <Animated.View
                          style={[
                            {
                              flex: 1,
                              gap: 20,
                            },
                            pageContentStyle,
                          ]}
                        >
                          <View
                            style={{
                              alignItems: 'flex-end',
                            }}
                          >
                            <Pressable
                              accessibilityLabel="关闭翻书预览"
                              accessibilityRole="button"
                              onPress={handleClose}
                              style={{
                                alignItems: 'center',
                                backgroundColor: '#F1EEE7',
                                borderCurve: 'continuous',
                                borderRadius: theme.radii.pill,
                                height: 36,
                                justifyContent: 'center',
                                width: 36,
                              }}
                            >
                              <Text
                                selectable
                                style={{
                                  color: '#9A9489',
                                  ...theme.typography.semiBold,
                                  fontSize: 18,
                                  lineHeight: 18,
                                }}
                              >
                                ×
                              </Text>
                            </Pressable>
                          </View>
                      <View style={{ gap: 8 }}>
                        <Text
                          selectable
                          style={{
                            color: '#A39E96',
                            ...theme.typography.medium,
                            fontSize: 12,
                            letterSpacing: 2.2,
                            textTransform: 'uppercase',
                          }}
                        >
                          cabinet preview
                        </Text>
                        <Text
                          numberOfLines={3}
                          selectable
                          style={{
                            color: '#2C2825',
                            ...theme.typography.heading,
                            fontSize: 32,
                            lineHeight: 38,
                          }}
                        >
                          {selectedCompartment.book ?? '在架书籍'}
                        </Text>
                        <Text
                          selectable
                          style={{
                            color: '#6B655C',
                            ...theme.typography.body,
                            fontSize: 16,
                            lineHeight: 22,
                          }}
                        >
                          {getCompartmentMeta(selectedCompartment)}
                        </Text>
                      </View>
                      <View style={{ gap: 10 }}>
                        <View
                          style={{
                            backgroundColor: '#F3F0EA',
                            borderCurve: 'continuous',
                            borderRadius: 999,
                            height: 8,
                            width: '100%',
                          }}
                        />
                        <View
                          style={{
                            backgroundColor: '#F3F0EA',
                            borderCurve: 'continuous',
                            borderRadius: 999,
                            height: 8,
                            width: '82%',
                          }}
                        />
                        <View
                          style={{
                            backgroundColor: '#F3F0EA',
                            borderCurve: 'continuous',
                            borderRadius: 999,
                            height: 8,
                            width: '65%',
                          }}
                        />
                      </View>
                      <View
                        style={{
                          backgroundColor: previewMode ? theme.colors.warningSurface : '#F8F4EE',
                          borderColor: previewMode ? 'rgba(180, 98, 27, 0.18)' : 'rgba(160, 148, 137, 0.12)',
                          borderCurve: 'continuous',
                          borderRadius: theme.radii.md,
                          borderWidth: 1,
                          gap: 6,
                          padding: 16,
                        }}
                      >
                        <Text
                          selectable
                          style={{
                            color: previewMode ? theme.colors.warningText : '#6B655C',
                            ...theme.typography.semiBold,
                            fontSize: 14,
                          }}
                        >
                          {previewMode ? '预览模式不可操作' : '准备从这个格口发起取书'}
                        </Text>
                        <Text
                          selectable
                          style={{
                            color: previewMode ? theme.colors.warningText : '#857E73',
                            ...theme.typography.body,
                            fontSize: 13,
                            lineHeight: 20,
                          }}
                        >
                          {previewMode
                            ? '你可以继续浏览书架和翻书动效，但不会真的向书柜发送开门指令。'
                            : '确认后会沿用当前的取书接口，并在成功后同步刷新书架状态。'}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: previewMode || isSubmitting }}
                        disabled={previewMode || isSubmitting}
                        onPress={handleTakeBook}
                        style={{
                          alignItems: 'center',
                          backgroundColor:
                            previewMode || isSubmitting
                              ? 'rgba(158, 195, 255, 0.38)'
                              : theme.colors.primaryStrong,
                          borderCurve: 'continuous',
                          borderRadius: theme.radii.pill,
                          boxShadow: theme.shadows.primary,
                          height: 64,
                          justifyContent: 'center',
                          marginTop: 'auto',
                        }}
                        testID="shelf-preview-action"
                      >
                        <Text
                          selectable
                          style={{
                            color: previewMode || isSubmitting
                              ? 'rgba(27, 42, 68, 0.58)'
                              : theme.colors.primaryText,
                            ...theme.typography.heading,
                            fontSize: 18,
                          }}
                        >
                          {isSubmitting ? '正在打开格口…' : '从这个格口取书'}
                        </Text>
                      </Pressable>
                        </Animated.View>
                    </Animated.View>

                    <Animated.View
                      pointerEvents="none"
                      style={[
                        {
                          bottom: 0,
                          left: 0,
                          position: 'absolute',
                          top: 0,
                          width: stageWidth,
                          zIndex: 2,
                        },
                        coverStyle,
                      ]}
                    >
                      <View
                        style={{
                          backgroundColor: selectedAppearance?.tint ?? theme.colors.primaryStrong,
                          borderColor: 'rgba(0,0,0,0.12)',
                          borderCurve: 'continuous',
                          borderRadius: 18,
                          borderWidth: 1,
                          boxShadow:
                            '10px 20px 50px rgba(0,0,0,0.15), inset 15px 0 30px rgba(0,0,0,0.12), inset 2px 0 5px rgba(0,0,0,0.05)',
                          flex: 1,
                          justifyContent: 'center',
                          overflow: 'hidden',
                          padding: 24,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: selectedAppearance?.accent ?? theme.colors.primary,
                            bottom: 0,
                            left: 0,
                            opacity: 0.22,
                            position: 'absolute',
                            right: 0,
                            top: 0,
                          }}
                        />
                        <View
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.18)',
                            bottom: 0,
                            left: 8,
                            position: 'absolute',
                            top: 0,
                            width: 10,
                          }}
                        />
                        <View
                          style={{
                            alignItems: 'center',
                            gap: 18,
                            justifyContent: 'center',
                          }}
                        >
                          <View
                            style={{
                              alignItems: 'center',
                              backgroundColor: 'rgba(255,255,255,0.18)',
                              borderColor: 'rgba(255,255,255,0.18)',
                              borderCurve: 'continuous',
                              borderRadius: theme.radii.pill,
                              borderWidth: 1,
                              boxShadow: `0 0 28px ${selectedAppearance?.glow ?? 'rgba(255,255,255,0.28)'}`,
                              height: 96,
                              justifyContent: 'center',
                              width: 96,
                            }}
                          >
                            <AppIcon
                              color={selectedAppearance?.text ?? theme.colors.white}
                              name="book"
                              size={40}
                              strokeWidth={1.6}
                            />
                          </View>
                          <Text
                            numberOfLines={3}
                            selectable
                            style={{
                              color: selectedAppearance?.text ?? theme.colors.white,
                              ...theme.typography.heading,
                              fontSize: 24,
                              letterSpacing: 1.1,
                              lineHeight: 32,
                              textAlign: 'center',
                            }}
                          >
                            {selectedCompartment.book ?? '在架书籍'}
                          </Text>
                        </View>
                      </View>
                    </Animated.View>
                  </View>
                </Pressable>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </Modal>
      ) : null}
    </View>
  );
}
