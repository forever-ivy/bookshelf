import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';

export type BookCoverTone = 'apricot' | 'blue' | 'coral' | 'lavender' | 'mint';

const BOOK_COVER_SOURCES = [
  require('../../assets/cover/cropped/cover_01_book_01.png'),
  require('../../assets/cover/cropped/cover_01_book_02.png'),
  require('../../assets/cover/cropped/cover_01_book_03.png'),
  require('../../assets/cover/cropped/cover_01_book_04.png'),
  require('../../assets/cover/cropped/cover_01_book_05.png'),
  require('../../assets/cover/cropped/cover_01_book_06.png'),
  require('../../assets/cover/cropped/cover_02_book_01.png'),
  require('../../assets/cover/cropped/cover_02_book_02.png'),
  require('../../assets/cover/cropped/cover_02_book_03.png'),
  require('../../assets/cover/cropped/cover_02_book_04.png'),
  require('../../assets/cover/cropped/cover_02_book_05.png'),
  require('../../assets/cover/cropped/cover_02_book_06.png'),
  require('../../assets/cover/cropped/cover_03_book_01.png'),
  require('../../assets/cover/cropped/cover_03_book_02.png'),
  require('../../assets/cover/cropped/cover_03_book_03.png'),
  require('../../assets/cover/cropped/cover_03_book_04.png'),
  require('../../assets/cover/cropped/cover_03_book_05.png'),
  require('../../assets/cover/cropped/cover_03_book_06.png'),
  require('../../assets/cover/cropped/cover_04_book_01.png'),
  require('../../assets/cover/cropped/cover_04_book_02.png'),
  require('../../assets/cover/cropped/cover_04_book_03.png'),
  require('../../assets/cover/cropped/cover_04_book_04.png'),
  require('../../assets/cover/cropped/cover_04_book_05.png'),
  require('../../assets/cover/cropped/cover_04_book_06.png'),
  require('../../assets/cover/cropped/cover_05_book_01.png'),
  require('../../assets/cover/cropped/cover_05_book_02.png'),
  require('../../assets/cover/cropped/cover_05_book_03.png'),
  require('../../assets/cover/cropped/cover_05_book_04.png'),
  require('../../assets/cover/cropped/cover_05_book_05.png'),
  require('../../assets/cover/cropped/cover_05_book_06.png'),
  require('../../assets/cover/cropped/cover_06_book_01.png'),
  require('../../assets/cover/cropped/cover_06_book_02.png'),
  require('../../assets/cover/cropped/cover_06_book_03.png'),
  require('../../assets/cover/cropped/cover_06_book_04.png'),
  require('../../assets/cover/cropped/cover_06_book_05.png'),
  require('../../assets/cover/cropped/cover_06_book_06.png'),
  require('../../assets/cover/cropped/cover_07_book_01.png'),
  require('../../assets/cover/cropped/cover_07_book_02.png'),
  require('../../assets/cover/cropped/cover_07_book_03.png'),
  require('../../assets/cover/cropped/cover_07_book_04.png'),
  require('../../assets/cover/cropped/cover_07_book_05.png'),
  require('../../assets/cover/cropped/cover_07_book_06.png'),
  require('../../assets/cover/cropped/cover_08_book_01.png'),
  require('../../assets/cover/cropped/cover_08_book_02.png'),
  require('../../assets/cover/cropped/cover_08_book_03.png'),
  require('../../assets/cover/cropped/cover_08_book_04.png'),
  require('../../assets/cover/cropped/cover_08_book_05.png'),
  require('../../assets/cover/cropped/cover_08_book_06.png'),
  require('../../assets/cover/cropped/cover_09_book_01.png'),
  require('../../assets/cover/cropped/cover_09_book_02.png'),
  require('../../assets/cover/cropped/cover_09_book_03.png'),
  require('../../assets/cover/cropped/cover_09_book_04.png'),
  require('../../assets/cover/cropped/cover_09_book_05.png'),
  require('../../assets/cover/cropped/cover_09_book_06.png'),
  require('../../assets/cover/cropped/cover_10_book_01.png'),
  require('../../assets/cover/cropped/cover_10_book_02.png'),
  require('../../assets/cover/cropped/cover_10_book_03.png'),
  require('../../assets/cover/cropped/cover_10_book_04.png'),
  require('../../assets/cover/cropped/cover_10_book_05.png'),
  require('../../assets/cover/cropped/cover_10_book_06.png'),
  require('../../assets/cover/cropped/cover_11_book_01.png'),
  require('../../assets/cover/cropped/cover_11_book_02.png'),
  require('../../assets/cover/cropped/cover_11_book_03.png'),
  require('../../assets/cover/cropped/cover_11_book_04.png'),
  require('../../assets/cover/cropped/cover_11_book_05.png'),
  require('../../assets/cover/cropped/cover_11_book_06.png'),
  require('../../assets/cover/cropped/cover_12_book_01.png'),
  require('../../assets/cover/cropped/cover_12_book_02.png'),
  require('../../assets/cover/cropped/cover_12_book_03.png'),
  require('../../assets/cover/cropped/cover_12_book_04.png'),
  require('../../assets/cover/cropped/cover_12_book_05.png'),
  require('../../assets/cover/cropped/cover_12_book_06.png'),
] as const;

const PORTRAIT_BOOK_COVER_SOURCES = BOOK_COVER_SOURCES;

const TONE_OFFSETS: Record<BookCoverTone, number> = {
  apricot: 7,
  blue: 0,
  coral: 19,
  lavender: 13,
  mint: 23,
};

function hashSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function resolveBookCoverSource(
  seed: string,
  tone: BookCoverTone,
  options?: {
    preferPortrait?: boolean;
  }
) {
  const sourcePool = options?.preferPortrait ? PORTRAIT_BOOK_COVER_SOURCES : BOOK_COVER_SOURCES;
  const index = (hashSeed(seed || tone) + TONE_OFFSETS[tone]) % sourcePool.length;

  return sourcePool[index];
}

type BookCoverProps = {
  borderRadius: number;
  height: number;
  seed: string;
  tone: BookCoverTone;
  width: number;
  imageTestID?: string;
  shellTestID?: string;
};

export function BookCover({
  height,
  imageTestID,
  seed,
  shellTestID,
  tone,
  width,
}: BookCoverProps) {
  const preferPortrait = width / height <= 0.82;

  return (
    <View
      style={{
        alignItems: 'center',
        height,
        justifyContent: 'center',
        width,
      }}
      testID={shellTestID}>
      <Image
        contentFit="contain"
        contentPosition="center"
        source={resolveBookCoverSource(seed, tone, { preferPortrait })}
        style={{
          height: '100%',
          width: '100%',
        }}
        testID={imageTestID}
      />
    </View>
  );
}
