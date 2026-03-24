import {
  buildMarkerRects,
  splitHighlightText,
} from '@/components/base/marker-highlight-text.utils';

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

describe('buildMarkerRects', () => {
  it('builds deterministic layered marker rectangles for wrapped lines', () => {
    expect(
      buildMarkerRects(
        [
          { height: 20, width: 46, x: 0, y: 0 },
          { height: 20, width: 72, x: 0, y: 20 },
        ],
        'medium'
      )
    ).toEqual([
      {
        lineIndex: 0,
        layer: 0,
        opacity: 0.34,
        x: -2,
        y: 3,
        width: 50,
        height: 12.4,
        rx: 6,
      },
      {
        lineIndex: 0,
        layer: 1,
        opacity: 0.22,
        x: 0,
        y: 5,
        width: 46,
        height: 10.8,
        rx: 6,
      },
      {
        lineIndex: 1,
        layer: 0,
        opacity: 0.34,
        x: -2,
        y: 23,
        width: 76,
        height: 12.4,
        rx: 6,
      },
      {
        lineIndex: 1,
        layer: 1,
        opacity: 0.22,
        x: 0,
        y: 25,
        width: 72,
        height: 10.8,
        rx: 6,
      },
    ]);
  });

  it('builds deterministic layered marker rectangles for soft intensity', () => {
    const rects = buildMarkerRects([{ height: 20, width: 46, x: 0, y: 0 }], 'soft');

    expect(rects).toHaveLength(2);
    expect(rects[0]).toEqual({
      lineIndex: 0,
      layer: 0,
      opacity: 0.28,
      x: -1,
      y: 2,
      width: 48,
      height: 10.8,
      rx: 6,
    });
    expect(rects[1]).toMatchObject({
      lineIndex: 0,
      layer: 1,
      opacity: 0.18,
      x: 0,
      y: 4,
      width: 46,
      rx: 6,
    });
    expect(rects[1].height).toBeCloseTo(9.2, 5);
  });
});
