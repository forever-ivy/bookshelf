import React, { useMemo, useState } from 'react';
import { Canvas, Path as SkiaPath } from '@shopify/react-native-skia';
import {
  StyleSheet,
  Text,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native';

import { appTheme } from '@/constants/app-theme';
import {
  buildMarkerFillPaths,
  buildUnderlineMarkerPaths,
  splitHighlightText,
  type MarkerFillPath,
  type MarkerIntensity,
  type MarkerHighlightVariant,
  type MarkerUnderlinePath,
} from '@/components/base/marker-highlight-text.utils';

const markerHighlightToneMap = {
  blue: appTheme.colors.markerHighlightBlue,
  green: appTheme.colors.markerHighlightGreen,
  orange: appTheme.colors.markerHighlightOrange,
  red: appTheme.colors.markerHighlightRed,
  yellow: appTheme.colors.markerHighlightYellow,
} as const;

export type MarkerHighlightTone = keyof typeof markerHighlightToneMap;

type MarkerHighlightTextProps = {
  text: string;
  highlight: string;
  textStyle?: StyleProp<TextStyle>;
  highlightColor?: string;
  highlightTone?: MarkerHighlightTone;
  variant?: MarkerHighlightVariant;
  markerIntensity?: MarkerIntensity;
  numberOfLines?: number;
};

type HighlightLine = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type HighlightLayout = {
  key: string;
  lines: HighlightLine[];
};

type ContainerLayoutState = {
  width: number | null;
  version: number;
};

function normalizeUnderlineLines(
  lines: HighlightLine[],
  resolvedLineHeight: number | null
) {
  if (resolvedLineHeight === null) {
    return lines;
  }

  return lines.map((line) => ({
    ...line,
    height: Math.max(line.height, resolvedLineHeight),
  }));
}

function resolveLineHeight(style: TextStyle | null) {
  if (typeof style?.lineHeight === 'number') {
    return style.lineHeight;
  }

  if (typeof style?.fontSize === 'number') {
    return Math.round(style.fontSize * 1.4);
  }

  return null;
}

function withHexAlpha(color: string, alpha: string) {
  if (color.startsWith('#') && color.length === 7) {
    return `${color}${alpha}`;
  }

  return color;
}

function getMarkerFallbackStyle(
  variant: MarkerHighlightVariant,
  color: string,
  hasOverlay: boolean
): TextStyle | undefined {
  if (variant === 'underline') {
    if (hasOverlay) {
      return undefined;
    }

    return {
      textDecorationColor: color,
      textDecorationLine: 'underline',
      textDecorationStyle: 'solid',
    };
  }

  if (hasOverlay) {
    return undefined;
  }

  return {
    backgroundColor: withHexAlpha(color, '88'),
    borderRadius: 6,
  };
}

export function MarkerHighlightText({
  text,
  highlight,
  textStyle,
  highlightColor,
  highlightTone = 'blue',
  variant = 'highlight',
  markerIntensity = 'medium',
  numberOfLines,
}: MarkerHighlightTextProps) {
  const parts = splitHighlightText(text, highlight);
  const resolvedHighlightColor =
    highlightColor ?? markerHighlightToneMap[highlightTone];
  const flattenedTextStyle = useMemo(
    () => StyleSheet.flatten(textStyle) ?? null,
    [textStyle]
  );
  const [containerLayout, setContainerLayout] = useState<ContainerLayoutState>({
    width: null,
    version: 0,
  });
  const textStyleSignature = useMemo(() => {
    return JSON.stringify(flattenedTextStyle);
  }, [flattenedTextStyle]);
  const fallbackUnderlineLineHeight = useMemo(
    () => resolveLineHeight(flattenedTextStyle),
    [flattenedTextStyle]
  );
  // Typography and container reflow can both change how the substring wraps.
  const layoutKey = `${text}\u0000${highlight}\u0000${numberOfLines ?? ''}\u0000${textStyleSignature}\u0000${containerLayout.version}`;
  const [layout, setLayout] = useState<HighlightLayout | null>(null);
  const hasFreshLayout = layout?.key === layoutKey;

  const fillPaths = useMemo<MarkerFillPath[]>(
    () =>
      hasFreshLayout && variant === 'highlight'
        ? buildMarkerFillPaths(layout.lines, markerIntensity, variant)
        : [],
    [hasFreshLayout, layout, markerIntensity, variant]
  );
  const underlineBrushes = useMemo<MarkerUnderlinePath[]>(
    () =>
      hasFreshLayout && variant === 'underline'
        ? buildUnderlineMarkerPaths(layout.lines, markerIntensity)
        : [],
    [hasFreshLayout, layout, markerIntensity, variant]
  );
  const hasOverlay =
    variant === 'underline' ? underlineBrushes.length > 0 : fillPaths.length > 0;
  const fallbackHighlightStyle = useMemo(() => {
    return getMarkerFallbackStyle(variant, resolvedHighlightColor, hasOverlay);
  }, [hasOverlay, resolvedHighlightColor, variant]);

  if (!parts) {
    return (
      <Text numberOfLines={numberOfLines} style={textStyle}>
        {text}
      </Text>
    );
  }

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    setContainerLayout((current) => {
      if (current.width === nextWidth) {
        return current;
      }

      return {
        width: nextWidth,
        version: current.width === null ? current.version : current.version + 1,
      };
    });
  };

  const overlay =
    variant === 'underline' && underlineBrushes.length > 0 ? (
      <View
        accessible={false}
        pointerEvents="none"
        style={styles.overlay}
        testID="marker-highlight-overlay"
      >
        <Canvas
          __destroyWebGLContextAfterRender
          accessible={false}
          pointerEvents="none"
          style={styles.overlay}
          testID="marker-highlight-skia-canvas">
        {underlineBrushes.map((brush) => (
          <SkiaPath
            key={`${brush.lineIndex}-${brush.layer}`}
            color={resolvedHighlightColor}
            opacity={brush.opacity}
            strokeCap="round"
            strokeJoin="round"
            strokeWidth={brush.strokeWidth}
            style="stroke"
            path={brush.d}
          />
        ))}
        </Canvas>
      </View>
    ) : fillPaths.length > 0 ? (
      <View
        accessible={false}
        pointerEvents="none"
        style={styles.overlay}
        testID="marker-highlight-overlay"
      >
        <Canvas
          __destroyWebGLContextAfterRender
          accessible={false}
          pointerEvents="none"
          style={styles.overlay}
          testID="marker-highlight-skia-canvas">
        {fillPaths.map((rect) => (
          <SkiaPath
            key={`${rect.lineIndex}-${rect.layer}`}
            color={resolvedHighlightColor}
            opacity={rect.opacity}
            path={rect.d}
          />
        ))}
        </Canvas>
      </View>
    ) : null;

  return (
    <View
      onLayout={handleContainerLayout}
      style={[styles.container, variant === 'underline' ? styles.underlineContainer : null]}
      testID="marker-highlight-root">
      {variant === 'highlight' ? overlay : null}
      <Text numberOfLines={numberOfLines} style={textStyle}>
        {parts.prefix}
        <Text
          style={fallbackHighlightStyle}
          onLayout={
            variant === 'underline'
              ? (event) => {
                  const { height, width, x, y } = event.nativeEvent.layout;
                  setLayout({
                    key: layoutKey,
                    lines: normalizeUnderlineLines(
                      [{ height, width, x, y }],
                      fallbackUnderlineLineHeight
                    ),
                  });
                }
              : undefined
          }
          onTextLayout={(event) => {
            setLayout({
              key: layoutKey,
              lines:
                variant === 'underline'
                  ? normalizeUnderlineLines(
                      event.nativeEvent.lines,
                      fallbackUnderlineLineHeight
                    )
                  : event.nativeEvent.lines,
            });
          }}>
          {parts.highlight}
        </Text>
        {parts.suffix}
      </Text>
      {variant === 'underline' ? (
        <View pointerEvents="none" style={styles.overlayForeground}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  overlayForeground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
    zIndex: 1,
  },
  underlineContainer: {
    paddingBottom: 8,
  },
});
