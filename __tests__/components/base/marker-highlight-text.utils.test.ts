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
      expect.objectContaining({
        lineIndex: 0,
        layer: 0,
        width: expect.any(Number),
      }),
      expect.objectContaining({
        lineIndex: 0,
        layer: 1,
        width: expect.any(Number),
      }),
      expect.objectContaining({
        lineIndex: 1,
        layer: 0,
        width: expect.any(Number),
      }),
      expect.objectContaining({
        lineIndex: 1,
        layer: 1,
        width: expect.any(Number),
      }),
    ]);
  });
});
