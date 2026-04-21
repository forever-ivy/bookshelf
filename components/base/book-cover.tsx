import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
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

const BOOK_COVER_GLOW_COLORS: Record<BookCoverTone, string> = {
  apricot: 'rgba(237, 231, 222, 0.96)',
  blue: 'rgba(233, 238, 243, 0.96)',
  coral: 'rgba(234, 227, 219, 0.96)',
  lavender: 'rgba(238, 241, 245, 0.96)',
  mint: 'rgba(231, 236, 231, 0.96)',
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

type BookCoverGlowProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  tone: BookCoverTone;
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

export function BookCoverGlow({
  children,
  style,
  testID,
  tone,
}: BookCoverGlowProps) {
  return (
    <View
      style={[
        {
          alignItems: 'center',
          backgroundColor: BOOK_COVER_GLOW_COLORS[tone],
          boxShadow: '0 10px 28px rgba(25, 23, 20, 0.08)',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
      testID={testID}>
      {children}
    </View>
  );
}
