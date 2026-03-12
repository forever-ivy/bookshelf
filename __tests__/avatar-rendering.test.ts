import { resolveAvatarVisual } from '@/lib/avatar-rendering';

describe('resolveAvatarVisual', () => {
  it('turns emoji avatars into a stable remote image source', () => {
    expect(resolveAvatarVisual('👨')).toEqual({
      kind: 'image',
      uri: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f468.png',
    });
  });

  it('keeps direct image urls as image sources', () => {
    expect(resolveAvatarVisual('https://example.com/avatar.png')).toEqual({
      kind: 'image',
      uri: 'https://example.com/avatar.png',
    });
  });

  it('falls back to text only when the avatar is not an emoji or image url', () => {
    expect(resolveAvatarVisual('A')).toEqual({
      kind: 'text',
      value: 'A',
    });
  });
});
