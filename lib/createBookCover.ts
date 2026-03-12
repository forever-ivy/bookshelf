export type CreateBookCoverInput = {
  coverUrl?: string | null;
  seed?: number | string | null;
  title: string;
};

export type GeneratedBookCover = {
  colors: readonly [string, string];
  kind: 'generated';
  title: string;
};

export type ImageBookCover = {
  fallback: GeneratedBookCover;
  kind: 'image';
  uri: string;
};

export type BookCover = GeneratedBookCover | ImageBookCover;

const generatedCoverPalettes = [
  ['#C8D8FF', '#E8EEFF'],
  ['#EBCFBA', '#FAE8DB'],
  ['#D0E7D1', '#E7F8E7'],
  ['#D8D2FF', '#F2F0FF'],
] as const;

const supportedImageUriPattern =
  /^(?:https?:\/\/|data:image\/|file:\/\/|content:\/\/)/i;

function hashString(value: string) {
  let hash = 5381;

  for (const character of value) {
    hash = ((hash << 5) + hash + (character.codePointAt(0) ?? 0)) >>> 0;
  }

  return hash;
}

function normalizeCoverTitle(title: string) {
  const trimmed = title.trim();

  return trimmed || '未命名书籍';
}

function normalizeCoverUrl(coverUrl?: string | null) {
  const trimmed = coverUrl?.trim() ?? '';

  return supportedImageUriPattern.test(trimmed) ? trimmed : null;
}

function createGeneratedBookCover(
  title: string,
  seed?: number | string | null
): GeneratedBookCover {
  const normalizedTitle = normalizeCoverTitle(title);
  const paletteSeed = `${normalizedTitle}:${String(seed ?? normalizedTitle)}`;
  const palette =
    generatedCoverPalettes[hashString(paletteSeed) % generatedCoverPalettes.length];

  return {
    colors: palette,
    kind: 'generated',
    title: normalizedTitle,
  };
}

export function createBookCover({
  coverUrl,
  seed,
  title,
}: CreateBookCoverInput): BookCover {
  const fallback = createGeneratedBookCover(title, seed);
  const normalizedCoverUrl = normalizeCoverUrl(coverUrl);

  if (!normalizedCoverUrl) {
    return fallback;
  }

  return {
    fallback,
    kind: 'image',
    uri: normalizedCoverUrl,
  };
}
