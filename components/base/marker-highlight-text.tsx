import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  View,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { appTheme } from '@/constants/app-theme';
import {
  buildMarkerRects,
  splitHighlightText,
  type MarkerIntensity,
} from '@/components/base/marker-highlight-text.utils';

type MarkerHighlightTextProps = {
  text: string;
  highlight: string;
  textStyle?: StyleProp<TextStyle>;
  highlightColor?: string;
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

export function MarkerHighlightText({
  text,
  highlight,
  textStyle,
  highlightColor = appTheme.colors.markerHighlightBlue,
  markerIntensity = 'medium',
  numberOfLines,
}: MarkerHighlightTextProps) {
  const parts = splitHighlightText(text, highlight);
  const [containerLayout, setContainerLayout] = useState<ContainerLayoutState>({
    width: null,
    version: 0,
  });
  const textStyleSignature = useMemo(() => {
    return JSON.stringify(StyleSheet.flatten(textStyle) ?? null);
  }, [textStyle]);
  // Typography and container reflow can both change how the substring wraps.
  const layoutKey = `${text}\u0000${highlight}\u0000${numberOfLines ?? ''}\u0000${textStyleSignature}\u0000${containerLayout.version}`;
  const [layout, setLayout] = useState<HighlightLayout | null>(null);
  const hasFreshLayout = layout?.key === layoutKey;

  const rects = useMemo(
    () =>
      hasFreshLayout ? buildMarkerRects(layout.lines, markerIntensity) : [],
    [hasFreshLayout, layout, markerIntensity]
  );

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

  return (
    <View onLayout={handleContainerLayout} style={styles.container} testID="marker-highlight-root">
      {rects.length > 0 ? (
        <Svg
          accessible={false}
          pointerEvents="none"
          style={[styles.overlay]}
          testID="marker-highlight-overlay">
          {rects.map((rect) => (
            <Rect
              key={`${rect.lineIndex}-${rect.layer}`}
              fill={highlightColor}
              fillOpacity={rect.opacity}
              height={rect.height}
              rx={rect.rx}
              testID="marker-highlight-rect"
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
          ))}
        </Svg>
      ) : null}
      <Text numberOfLines={numberOfLines} style={textStyle}>
        {parts.prefix}
        <Text
          onTextLayout={(event) => {
            setLayout({
              key: layoutKey,
              lines: event.nativeEvent.lines,
            });
          }}>
          {parts.highlight}
        </Text>
        {parts.suffix}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
