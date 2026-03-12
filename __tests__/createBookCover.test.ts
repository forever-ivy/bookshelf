import { createBookCover } from '@/lib/createBookCover';

describe('createBookCover', () => {
  it('returns a generated cover when no remote cover url is provided', () => {
    const cover = createBookCover({
      seed: 201,
      title: '月光图书馆',
    });

    expect(cover).toMatchObject({
      kind: 'generated',
      title: '月光图书馆',
    });

    expect(cover.colors).toHaveLength(2);
  });

  it('returns an image cover with a generated fallback for valid remote urls', () => {
    expect(
      createBookCover({
        coverUrl: 'https://example.com/covers/moonlight-library.jpg',
        seed: 201,
        title: '月光图书馆',
      })
    ).toMatchObject({
      fallback: {
        kind: 'generated',
        title: '月光图书馆',
      },
      kind: 'image',
      uri: 'https://example.com/covers/moonlight-library.jpg',
    });
  });

  it('ignores blank or unsupported cover urls and falls back to a generated cover', () => {
    const withoutSupportedUrl = createBookCover({
      coverUrl: 'moonlight-library.jpg',
      seed: 'custom-seed',
      title: '月光图书馆',
    });

    expect(withoutSupportedUrl).toMatchObject({
      kind: 'generated',
      title: '月光图书馆',
    });
  });

  it('uses the same generated palette for the same title and seed', () => {
    const first = createBookCover({
      seed: 101,
      title: '一起读的故事',
    });

    const second = createBookCover({
      seed: 101,
      title: '一起读的故事',
    });

    expect(first).toEqual(second);
  });
});
