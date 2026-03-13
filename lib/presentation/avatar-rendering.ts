const twemojiBaseUrl =
  'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72';

const imageUrlPattern = /^(?:https?:\/\/|data:image\/)/i;
const emojiPattern = /\p{Extended_Pictographic}/u;

type AvatarVisual =
  | {
      kind: 'image';
      uri: string;
    }
  | {
      kind: 'text';
      value: string;
    };

function toCodePointSequence(value: string) {
  return Array.from(value)
    .map((character) => character.codePointAt(0)?.toString(16))
    .filter(Boolean)
    .join('-');
}

export function resolveAvatarVisual(avatar?: string | null): AvatarVisual {
  const trimmed = avatar?.trim() ?? '';

  if (!trimmed) {
    return { kind: 'text', value: '?' };
  }

  if (imageUrlPattern.test(trimmed)) {
    return { kind: 'image', uri: trimmed };
  }

  if (emojiPattern.test(trimmed)) {
    return {
      kind: 'image',
      uri: `${twemojiBaseUrl}/${toCodePointSequence(trimmed)}.png`,
    };
  }

  return { kind: 'text', value: trimmed };
}
