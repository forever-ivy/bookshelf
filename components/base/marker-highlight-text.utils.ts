export type MarkerIntensity = 'soft' | 'medium';

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

export function buildMarkerRects(
  lines: { width: number; height: number; x: number; y: number }[],
  intensity: MarkerIntensity
) {
  const layers =
    intensity === 'medium'
      ? [
          { insetX: 2, offsetY: 3, heightRatio: 0.62, opacity: 0.34 },
          { insetX: 0, offsetY: 5, heightRatio: 0.54, opacity: 0.22 },
        ]
      : [
          { insetX: 1, offsetY: 2, heightRatio: 0.54, opacity: 0.28 },
          { insetX: 0, offsetY: 4, heightRatio: 0.46, opacity: 0.18 },
        ];

  return lines.flatMap((line, lineIndex) =>
    layers.map((layer, layerIndex) => ({
      lineIndex,
      layer: layerIndex,
      opacity: layer.opacity,
      x: line.x - layer.insetX,
      y: line.y + layer.offsetY,
      width: line.width + layer.insetX * 2,
      height: line.height * layer.heightRatio,
      rx: 6,
    }))
  );
}
