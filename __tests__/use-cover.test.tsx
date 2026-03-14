import { act, renderHook } from '@testing-library/react-native';

import { useCover } from '@/hooks/use-cover';

type CoverHookProps = {
  coverUrl?: string;
  seed: number;
  title: string;
};

describe('useCover', () => {
  it('returns a generated cover immediately when no cover url exists', () => {
    const { result } = renderHook(() =>
      useCover({
        seed: 301,
        title: '小小建筑师',
      })
    );

    expect(result.current.cover).toMatchObject({
      kind: 'generated',
      title: '小小建筑师',
    });
  });

  it('falls back to the generated cover after the image fails to load', () => {
    const { result } = renderHook(() =>
      useCover({
        coverUrl: 'https://example.com/covers/forest-and-sea.png',
        seed: 202,
        title: '森林与海相遇的地方',
      })
    );

    expect(result.current.cover).toMatchObject({
      fallback: {
        kind: 'generated',
        title: '森林与海相遇的地方',
      },
      kind: 'image',
      uri: 'https://example.com/covers/forest-and-sea.png',
    });

    act(() => {
      result.current.handleImageError();
    });

    expect(result.current.cover).toMatchObject({
      kind: 'generated',
      title: '森林与海相遇的地方',
    });
  });

  it('resets the failure state when a different remote cover arrives', () => {
    const { result, rerender } = renderHook(
      ({ coverUrl, seed, title }: CoverHookProps) =>
        useCover({
          coverUrl,
          seed,
          title,
        }),
      {
        initialProps: {
          coverUrl: 'https://example.com/covers/story-one.png',
          seed: 101,
          title: '一起读的故事',
        },
      }
    );

    act(() => {
      result.current.handleImageError();
    });

    expect(result.current.cover).toMatchObject({
      kind: 'generated',
      title: '一起读的故事',
    });

    rerender({
      coverUrl: 'https://example.com/covers/story-two.png',
      seed: 102,
      title: '一起读的故事',
    });

    expect(result.current.cover).toMatchObject({
      fallback: {
        kind: 'generated',
        title: '一起读的故事',
      },
      kind: 'image',
      uri: 'https://example.com/covers/story-two.png',
    });
  });
});
