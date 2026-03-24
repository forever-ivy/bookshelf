import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle, View } from 'react-native';
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

export function MarkerHighlightText({
  text,
  highlight,
  textStyle,
  highlightColor = appTheme.colors.markerHighlightBlue,
  markerIntensity = 'medium',
  numberOfLines,
}: MarkerHighlightTextProps) {
  const parts = splitHighlightText(text, highlight);
  const layoutKey = `${text}\u0000${highlight}`;
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

  return (
    <View style={styles.container}>
      {rects.length > 0 ? (
        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
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
});
