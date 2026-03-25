import {
  buildMarkerFillPaths,
  buildUnderlineMarkerPaths,
  type MarkerFillPath,
  type MarkerUnderlinePath,
  splitHighlightText,
} from '@/components/base/marker-highlight-text.utils';

type Point = {
  x: number;
  y: number;
};

function getCubicValue(p0: number, p1: number, p2: number, p3: number, t: number) {
  const inverseT = 1 - t;
  return (
    inverseT * inverseT * inverseT * p0 +
    3 * inverseT * inverseT * t * p1 +
    3 * inverseT * t * t * p2 +
    t * t * t * p3
  );
}

function getCubicDerivativeRoots(p0: number, p1: number, p2: number, p3: number) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3;
  const b = 2 * (p0 - 2 * p1 + p2);
  const c = -p0 + p1;
  const roots: number[] = [];

  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) {
      const root = -c / b;
      if (root > 0 && root < 1) {
        roots.push(root);
      }
    }
    return roots;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return roots;
  }

  const squareRoot = Math.sqrt(discriminant);
  const firstRoot = (-b + squareRoot) / (2 * a);
  const secondRoot = (-b - squareRoot) / (2 * a);

  if (firstRoot > 0 && firstRoot < 1) {
    roots.push(firstRoot);
  }
  if (secondRoot > 0 && secondRoot < 1) {
    roots.push(secondRoot);
  }

  return roots;
}

function getPathBounds(d: string) {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  let tokenIndex = 0;
  let command: string | null = null;
  let currentPoint: Point = { x: 0, y: 0 };
  let subpathStartPoint: Point = { x: 0, y: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const addPoint = (point: Point) => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  };

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (/^[A-Za-z]$/.test(token)) {
      command = token;
      tokenIndex += 1;
    }

    if (!command) {
      throw new Error(`Unexpected path token sequence in "${d}"`);
    }

    if (command === 'M') {
      const nextPoint = {
        x: Number(tokens[tokenIndex]),
        y: Number(tokens[tokenIndex + 1]),
      };
      currentPoint = nextPoint;
      subpathStartPoint = nextPoint;
      addPoint(nextPoint);
      tokenIndex += 2;
      command = 'L';
      continue;
    }

    if (command === 'L') {
      const nextPoint = {
        x: Number(tokens[tokenIndex]),
        y: Number(tokens[tokenIndex + 1]),
      };
      currentPoint = nextPoint;
      addPoint(nextPoint);
      tokenIndex += 2;
      continue;
    }

    if (command === 'C') {
      const control1 = {
        x: Number(tokens[tokenIndex]),
        y: Number(tokens[tokenIndex + 1]),
      };
      const control2 = {
        x: Number(tokens[tokenIndex + 2]),
        y: Number(tokens[tokenIndex + 3]),
      };
      const nextPoint = {
        x: Number(tokens[tokenIndex + 4]),
        y: Number(tokens[tokenIndex + 5]),
      };

      addPoint(currentPoint);
      addPoint(nextPoint);

      for (const root of getCubicDerivativeRoots(currentPoint.x, control1.x, control2.x, nextPoint.x)) {
        addPoint({
          x: getCubicValue(currentPoint.x, control1.x, control2.x, nextPoint.x, root),
          y: getCubicValue(currentPoint.y, control1.y, control2.y, nextPoint.y, root),
        });
      }
      for (const root of getCubicDerivativeRoots(currentPoint.y, control1.y, control2.y, nextPoint.y)) {
        addPoint({
          x: getCubicValue(currentPoint.x, control1.x, control2.x, nextPoint.x, root),
          y: getCubicValue(currentPoint.y, control1.y, control2.y, nextPoint.y, root),
        });
      }

      currentPoint = nextPoint;
      tokenIndex += 6;
      continue;
    }

    if (command === 'Z' || command === 'z') {
      addPoint(subpathStartPoint);
      currentPoint = subpathStartPoint;
      continue;
    }

    throw new Error(`Unsupported path command "${command}" in "${d}"`);
  }

  return {
    maxX,
    maxY,
    minX,
    minY,
  };
}

function getPathHeight(bounds: ReturnType<typeof getPathBounds>) {
  return bounds.maxY - bounds.minY;
}

function getPathWidth(bounds: ReturnType<typeof getPathBounds>) {
  return bounds.maxX - bounds.minX;
}

describe('splitHighlightText', () => {
  it('splits the first exact match into prefix, highlight, and suffix', () => {
    expect(
      splitHighlightText('搜索书名、作者、课程或自然语言', '课程或自然语言')
    ).toEqual({
      prefix: '搜索书名、作者、',
      highlight: '课程或自然语言',
      suffix: '',
    });
  });

  it('uses the first exact match when the highlight appears more than once', () => {
    expect(
      splitHighlightText('搜索书名、课程或自然语言、课程或自然语言', '课程或自然语言')
    ).toEqual({
      prefix: '搜索书名、',
      highlight: '课程或自然语言',
      suffix: '、课程或自然语言',
    });
  });

  it('returns null when highlight is empty or not found', () => {
    expect(splitHighlightText('搜索书名', '')).toBeNull();
    expect(splitHighlightText('搜索书名', '自然语言')).toBeNull();
  });
});

describe('buildMarkerFillPaths', () => {
  function expectPrimaryEchoFillRelationship(
    primaryFill: MarkerFillPath,
    echoFill: MarkerFillPath
  ) {
    const primaryBounds = getPathBounds(primaryFill.d);
    const echoBounds = getPathBounds(echoFill.d);

    expect(getPathWidth(primaryBounds)).toBeGreaterThan(getPathWidth(echoBounds) + 1.5);
    expect(getPathHeight(primaryBounds)).toBeGreaterThan(getPathHeight(echoBounds) + 1.1);
    expect(primaryBounds.minX).toBeLessThan(echoBounds.minX - 0.25);
    expect(primaryBounds.maxX).toBeGreaterThan(echoBounds.maxX + 1.2);
    expect(primaryBounds.minY).toBeLessThan(echoBounds.minY - 0.6);
  }

  it('builds deterministic closed marker fill paths for wrapped lines', () => {
    const paths = buildMarkerFillPaths(
      [
        { height: 20, width: 46, x: 0, y: 0 },
        { height: 20, width: 72, x: 0, y: 20 },
      ],
      'medium'
    );
    const repeatedPaths = buildMarkerFillPaths(
      [
        { height: 20, width: 46, x: 0, y: 0 },
        { height: 20, width: 72, x: 0, y: 20 },
      ],
      'medium'
    );

    expect(paths).toHaveLength(4);
    expect(paths).toEqual(repeatedPaths);
    expect(paths[0]).toMatchObject({
      lineIndex: 0,
      layer: 0,
      opacity: 0.46,
    });
    expect(paths[0].d).toMatch(/^M /);
    expect(paths[0].d.endsWith(' Z')).toBe(true);
    expect(paths[2]).toMatchObject({
      lineIndex: 1,
      layer: 0,
      opacity: 0.46,
    });
    expect(paths[2].d).not.toBe(paths[0].d);
    expectPrimaryEchoFillRelationship(paths[0], paths[1]);
    expectPrimaryEchoFillRelationship(paths[2], paths[3]);
  });

  it('builds deterministic closed marker fill paths for soft intensity', () => {
    const paths = buildMarkerFillPaths([{ height: 20, width: 46, x: 0, y: 0 }], 'soft');
    const repeatedPaths = buildMarkerFillPaths([{ height: 20, width: 46, x: 0, y: 0 }], 'soft');

    expect(paths).toHaveLength(2);
    expect(paths).toEqual(repeatedPaths);
    expect(paths[0]).toMatchObject({
      lineIndex: 0,
      layer: 0,
      opacity: 0.34,
    });
    expect(paths[0].d.endsWith(' Z')).toBe(true);
    expect(paths[1]).toMatchObject({
      lineIndex: 0,
      layer: 1,
      opacity: 0.24,
    });
    expectPrimaryEchoFillRelationship(paths[0], paths[1]);
  });

  it('returns no fill paths for underline mode', () => {
    expect(
      buildMarkerFillPaths([{ height: 20, width: 46, x: 0, y: 0 }], 'medium', 'underline')
    ).toEqual([]);
  });

  it('locks the primary fill envelope to a wider, taller marker swipe', () => {
    const [primaryFill] = buildMarkerFillPaths(
      [{ height: 20, width: 46, x: 0, y: 0 }],
      'medium'
    );

    const bounds = getPathBounds(primaryFill.d);

    expect(primaryFill.d.endsWith(' Z')).toBe(true);
    expect(bounds.minX).toBeLessThan(-3.6);
    expect(bounds.maxX).toBeGreaterThan(50.6);
    expect(getPathHeight(bounds)).toBeGreaterThan(15.4);
  });
});

describe('buildUnderlineMarkerPaths', () => {
  function expectPrimaryEchoBrushRelationship(
    primaryStroke: MarkerUnderlinePath,
    echoStroke: MarkerUnderlinePath
  ) {
    const primaryBounds = getPathBounds(primaryStroke.d);
    const echoBounds = getPathBounds(echoStroke.d);

    expect(getPathWidth(primaryBounds)).toBeGreaterThan(getPathWidth(echoBounds) + 4);
    expect(primaryBounds.minX).toBeLessThan(echoBounds.minX - 1);
    expect(primaryBounds.maxX).toBeGreaterThan(echoBounds.maxX + 2.5);
    expect(Math.abs(primaryBounds.minY - echoBounds.minY)).toBeGreaterThan(0.05);
  }

  it('builds deterministic underline marker paths for medium intensity', () => {
    const strokes = buildUnderlineMarkerPaths(
      [{ height: 20, width: 46, x: 0, y: 0 }],
      'medium'
    );
    const repeatedStrokes = buildUnderlineMarkerPaths(
      [{ height: 20, width: 46, x: 0, y: 0 }],
      'medium'
    );

    expect(strokes).toHaveLength(2);
    expect(strokes).toEqual(repeatedStrokes);
    expect(strokes[0]).toMatchObject({
      lineIndex: 0,
      layer: 0,
      opacity: 0.92,
      strokeWidth: 5.1,
    });
    expect(strokes[0].d).toMatch(/^M /);
    expect(strokes[0].d.endsWith(' Z')).toBe(false);

    expect(strokes[1]).toMatchObject({
      lineIndex: 0,
      layer: 1,
      opacity: 0.52,
      strokeWidth: 2.1,
    });
    expect(strokes[1].d).not.toBe(strokes[0].d);
    expectPrimaryEchoBrushRelationship(strokes[0], strokes[1]);
  });

  it('builds deterministic underline marker paths for soft intensity', () => {
    const strokes = buildUnderlineMarkerPaths(
      [{ height: 20, width: 46, x: 0, y: 0 }],
      'soft'
    );
    const repeatedStrokes = buildUnderlineMarkerPaths(
      [{ height: 20, width: 46, x: 0, y: 0 }],
      'soft'
    );

    expect(strokes).toHaveLength(2);
    expect(strokes).toEqual(repeatedStrokes);
    expect(strokes[0]).toMatchObject({
      lineIndex: 0,
      layer: 0,
      opacity: 0.8,
      strokeWidth: 4,
    });
    expect(strokes[0].d.endsWith(' Z')).toBe(false);
    expect(strokes[1]).toMatchObject({
      lineIndex: 0,
      layer: 1,
      opacity: 0.44,
      strokeWidth: 1.8,
    });
    expectPrimaryEchoBrushRelationship(strokes[0], strokes[1]);
  });

  it('locks the primary underline envelope lower and longer than the current brush', () => {
    const [primaryStroke] = buildUnderlineMarkerPaths(
      [{ height: 20, width: 46, x: 0, y: 0 }],
      'medium'
    );

    const bounds = getPathBounds(primaryStroke.d);

    expect(primaryStroke.d.endsWith(' Z')).toBe(false);
    expect(bounds.minX).toBeLessThan(-6.8);
    expect(bounds.maxX).toBeGreaterThan(56.8);
    expect(bounds.minY).toBeGreaterThan(18.7);
  });
});
