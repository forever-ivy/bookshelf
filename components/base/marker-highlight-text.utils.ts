export type MarkerIntensity = 'soft' | 'medium';
export type MarkerHighlightVariant = 'highlight' | 'underline';
type MarkerLine = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type MarkerFillPath = {
  d: string;
  lineIndex: number;
  layer: number;
  opacity: number;
};

export type MarkerUnderlinePath = {
  d: string;
  lineIndex: number;
  layer: number;
  opacity: number;
  strokeWidth: number;
};

export function splitHighlightText(text: string, highlight: string) {
  if (!highlight) {
    return null;
  }

  const start = text.indexOf(highlight);
  if (start < 0) {
    return null;
  }

  return {
    prefix: text.slice(0, start),
    highlight,
    suffix: text.slice(start + highlight.length),
  };
}

function formatPathNumber(value: number) {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2);
}

function toPoint(x: number, y: number) {
  return `${formatPathNumber(x)} ${formatPathNumber(y)}`;
}

function createCurveTo(
  control1X: number,
  control1Y: number,
  control2X: number,
  control2Y: number,
  x: number,
  y: number
) {
  return `C ${toPoint(control1X, control1Y)} ${toPoint(control2X, control2Y)} ${toPoint(x, y)}`;
}

export function buildMarkerFillPaths(
  lines: MarkerLine[],
  intensity: MarkerIntensity,
  variant: MarkerHighlightVariant = 'highlight'
) {
  if (variant === 'underline') {
    return [];
  }

  const layers =
    intensity === 'medium'
      ? [
          {
            bottomRatio: 1.02,
            endInsetX: 6.4,
            opacity: 0.46,
            startInsetX: 5.0,
            topRatio: 0.2,
          },
          {
            bottomRatio: 0.94,
            endInsetX: 3.4,
            opacity: 0.32,
            startInsetX: 2.2,
            topRatio: 0.27,
          },
        ]
      : [
          {
            bottomRatio: 0.94,
            endInsetX: 4.0,
            opacity: 0.34,
            startInsetX: 3.0,
            topRatio: 0.25,
          },
          {
            bottomRatio: 0.88,
            endInsetX: 2.3,
            opacity: 0.24,
            startInsetX: 1.5,
            topRatio: 0.31,
          },
        ];

  return lines.flatMap((line, lineIndex) =>
    layers.map((layer, layerIndex) => {
      const left =
        line.x -
        layer.startInsetX +
        getDeterministicJitter(line, lineIndex, layerIndex, 1, 0.9);
      const right =
        line.x +
        line.width +
        layer.endInsetX +
        getDeterministicJitter(line, lineIndex, layerIndex, 2, 0.9);
      const width = Math.max(right - left, line.width * 0.9);
      const topLeftY =
        line.y +
        line.height * layer.topRatio +
        getDeterministicJitter(line, lineIndex, layerIndex, 3, 0.55);
      const topRightY =
        line.y +
        line.height * (layer.topRatio + 0.06) +
        getDeterministicJitter(line, lineIndex, layerIndex, 4, 0.55);
      const bottomRightY =
        line.y +
        line.height * layer.bottomRatio +
        getDeterministicJitter(line, lineIndex, layerIndex, 5, 0.68);
      const bottomLeftY =
        line.y +
        line.height * (layer.bottomRatio - 0.08) +
        getDeterministicJitter(line, lineIndex, layerIndex, 6, 0.68);
      const upperMidLeftX =
        left + width * 0.24 + getDeterministicJitter(line, lineIndex, layerIndex, 7, 1.25);
      const upperMidRightX =
        left + width * 0.77 + getDeterministicJitter(line, lineIndex, layerIndex, 8, 1.25);
      const lowerMidRightX =
        left + width * 0.73 + getDeterministicJitter(line, lineIndex, layerIndex, 9, 1.35);
      const lowerMidLeftX =
        left + width * 0.27 + getDeterministicJitter(line, lineIndex, layerIndex, 10, 1.35);

      const d = [
        `M ${toPoint(left, topLeftY)}`,
        createCurveTo(
          left + width * 0.11,
          topLeftY - 1.4 + getDeterministicJitter(line, lineIndex, layerIndex, 11, 0.7),
          upperMidLeftX,
          topLeftY + getDeterministicJitter(line, lineIndex, layerIndex, 12, 0.7),
          left + width * 0.47,
          line.y +
            line.height * (layer.topRatio - 0.03) +
            getDeterministicJitter(line, lineIndex, layerIndex, 13, 0.65)
        ),
        createCurveTo(
          upperMidRightX,
          topRightY + getDeterministicJitter(line, lineIndex, layerIndex, 14, 0.7),
          right - width * 0.11,
          topRightY - 1.15 + getDeterministicJitter(line, lineIndex, layerIndex, 15, 0.65),
          right,
          topRightY
        ),
        `L ${toPoint(
          right - 1.0 + getDeterministicJitter(line, lineIndex, layerIndex, 16, 0.6),
          bottomRightY
        )}`,
        createCurveTo(
          right - width * 0.12,
          bottomRightY + 1.4 + getDeterministicJitter(line, lineIndex, layerIndex, 17, 0.75),
          lowerMidRightX,
          bottomRightY + getDeterministicJitter(line, lineIndex, layerIndex, 18, 0.75),
          left + width * 0.51,
          line.y +
            line.height * (layer.bottomRatio - 0.04) +
            getDeterministicJitter(line, lineIndex, layerIndex, 19, 0.7)
        ),
        createCurveTo(
          lowerMidLeftX,
          bottomLeftY + getDeterministicJitter(line, lineIndex, layerIndex, 20, 0.75),
          left + width * 0.08,
          bottomLeftY + 0.95 + getDeterministicJitter(line, lineIndex, layerIndex, 21, 0.7),
          left,
          bottomLeftY
        ),
        'Z',
      ].join(' ');

      return {
        d,
        lineIndex,
        layer: layerIndex,
        opacity: layer.opacity,
      };
    })
  );
}

function getDeterministicJitter(
  line: { width: number; height: number; x: number; y: number },
  lineIndex: number,
  layerIndex: number,
  slot: number,
  maxOffset: number
) {
  const seed =
    line.width * 0.173 +
    line.height * 0.289 +
    (line.x + 1) * 0.113 +
    (line.y + 1) * 0.137 +
    (lineIndex + 1) * 1.971 +
    (layerIndex + 1) * 3.113 +
    slot * 0.619;
  const normalized = Math.sin(seed * 12.9898) * 43758.5453123;
  const fractional = normalized - Math.floor(normalized);

  return (fractional - 0.5) * maxOffset * 2;
}

export function buildUnderlineMarkerPaths(
  lines: MarkerLine[],
  intensity: MarkerIntensity
): MarkerUnderlinePath[] {
  const layers =
    intensity === 'medium'
      ? [
          {
            endInsetX: 12.2,
            opacity: 0.92,
            startInsetX: -8.4,
            strokeWidth: 5.1,
            waveHeight: 1.18,
            yOffsetRatio: 0.975,
          },
          {
            endInsetX: 5.8,
            opacity: 0.52,
            startInsetX: -5.2,
            strokeWidth: 2.1,
            waveHeight: 0.52,
            yOffsetRatio: 0.988,
          },
        ]
      : [
          {
            endInsetX: 9.4,
            opacity: 0.8,
            startInsetX: -6.1,
            strokeWidth: 4.0,
            waveHeight: 0.88,
            yOffsetRatio: 0.965,
          },
          {
            endInsetX: 4.8,
            opacity: 0.44,
            startInsetX: -3.8,
            strokeWidth: 1.8,
            waveHeight: 0.42,
            yOffsetRatio: 0.984,
          },
        ];

  return lines.flatMap((line, lineIndex) =>
    layers.map((layer, layerIndex) => {
      const startX =
        line.x +
        layer.startInsetX +
        getDeterministicJitter(line, lineIndex, layerIndex, 1, 0.9);
      const width = Math.max(
        line.width + layer.endInsetX - layer.startInsetX,
        line.width * 0.82
      );
      const y =
        line.y +
        line.height * layer.yOffsetRatio +
        getDeterministicJitter(line, lineIndex, layerIndex, 2, 0.18);
      const endX =
        startX +
        width +
        getDeterministicJitter(line, lineIndex, layerIndex, 3, 0.5);
      const startY = y + getDeterministicJitter(line, lineIndex, layerIndex, 4, 0.12);
      const midY = y + getDeterministicJitter(line, lineIndex, layerIndex, 5, 0.1);
      const endY = y + getDeterministicJitter(line, lineIndex, layerIndex, 6, 0.12);

      const d = [
        `M ${toPoint(startX, startY)}`,
        createCurveTo(
          startX + width * 0.14,
          y + layer.waveHeight * 0.7 +
            getDeterministicJitter(line, lineIndex, layerIndex, 7, 0.2),
          startX + width * 0.31,
          y - layer.waveHeight * 0.2 +
            getDeterministicJitter(line, lineIndex, layerIndex, 8, 0.16),
          startX + width * 0.5,
          midY
        ),
        createCurveTo(
          startX + width * 0.68,
          y + layer.waveHeight * 0.52 +
            getDeterministicJitter(line, lineIndex, layerIndex, 9, 0.18),
          startX + width * 0.89,
          y - layer.waveHeight * 0.12 +
            getDeterministicJitter(line, lineIndex, layerIndex, 10, 0.14),
          endX,
          endY
        ),
      ].join(' ');

      return {
        d,
        lineIndex,
        layer: layerIndex,
        opacity: layer.opacity,
        strokeWidth: layer.strokeWidth,
      };
    })
  );
}
