import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  type SharedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useCover } from '@/hooks/use-cover';
import type { BooklistItem } from '@/lib/api/contracts/types';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';

type BookCarouselCardProps = {
  items: BooklistItem[];
};

const BOOK_CARD_WIDTH = 148;
const BOOK_CARD_GAP = 14;
const BOOK_CARD_SPAN = BOOK_CARD_WIDTH + BOOK_CARD_GAP;

type BooklistItemWithCoverFields = BooklistItem & {
  cover?: string | null;
  coverUrl?: string | null;
  cover_url?: string | null;
  image?: string | null;
  image_url?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;
  thumbnail_url?: string | null;
};

const bookCoverContainerStyle = {
  borderCurve: 'continuous' as const,
  borderRadius: 28,
  height: 176,
  justifyContent: 'flex-end' as const,
  overflow: 'hidden' as const,
  padding: 16,
};

function resolveBookCoverUrl(item: BooklistItem) {
  const candidate = item as BooklistItemWithCoverFields;

  return (
    candidate.coverUrl ??
    candidate.cover_url ??
    candidate.cover ??
    candidate.image ??
    candidate.image_url ??
    candidate.thumbnailUrl ??
    candidate.thumbnail_url ??
    candidate.thumbnail ??
    null
  );
}

export function BookCarouselCard({ items }: BookCarouselCardProps) {
  const { theme } = useBookleafTheme();
  const visibleItems = items.slice(0, 6);
  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 26,
          }}>
          家庭书库
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
          }}>
          把这周要读的书放在随手可见的位置。
        </Text>
      </View>
      <Animated.ScrollView
        contentContainerStyle={{ gap: 14, paddingRight: 24 }}
        horizontal
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}>
        {visibleItems.map((item, index) => (
          <BookCarouselItem
            index={index}
            key={item.id}
            item={item}
            scrollX={scrollX}
          />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

type BookCarouselItemProps = {
  index: number;
  item: BooklistItem;
  scrollX: SharedValue<number>;
};

function BookCarouselItem({ index, item, scrollX }: BookCarouselItemProps) {
  const { theme } = useBookleafTheme();
  const { cover, handleImageError } = useCover({
    coverUrl: resolveBookCoverUrl(item),
    seed: item.id,
    title: item.title,
  });
  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scrollX.value,
          [
            index * BOOK_CARD_SPAN - BOOK_CARD_SPAN,
            index * BOOK_CARD_SPAN,
            index * BOOK_CARD_SPAN + BOOK_CARD_SPAN,
          ],
          [0.96, 1, 0.96],
          'clamp'
        ),
      },
      {
        translateY: interpolate(
          scrollX.value,
          [
            index * BOOK_CARD_SPAN - BOOK_CARD_SPAN,
            index * BOOK_CARD_SPAN,
            index * BOOK_CARD_SPAN + BOOK_CARD_SPAN,
          ],
          [6, 0, 6],
          'clamp'
        ),
      },
    ],
  }));

  return (
    <Animated.View
      entering={createStaggeredFadeIn(index, 45)}
      layout={motionTransitions.gentle}
      style={{ width: BOOK_CARD_WIDTH }}
      testID={`book-carousel-item-layout-${index}`}>
      <Animated.View
        style={[
          {
            gap: 10,
          },
          cardStyle,
        ]}
        testID={`book-carousel-item-motion-${index}`}>
        {cover.kind === 'image' ? (
          <View style={bookCoverContainerStyle}>
            <Image
              contentFit="cover"
              onError={handleImageError}
              source={{ uri: cover.uri }}
              style={StyleSheet.absoluteFillObject}
              transition={120}
            />
          </View>
        ) : (
          <View
            style={bookCoverContainerStyle}>
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: cover.colors[0],
                  opacity: 0.9,
                },
              ]}
            />
            <View
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: cover.colors[1],
                  opacity: 0.35,
                },
              ]}
            />
            <Text
              numberOfLines={4}
              selectable
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 20,
                lineHeight: 24,
              }}>
              {cover.title}
            </Text>
          </View>
        )}
        <View style={{ gap: 2 }}>
          <Text
            numberOfLines={1}
            selectable
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {item.title}
          </Text>
          <Text
            numberOfLines={2}
            selectable
            style={{
              color: item.done
                ? theme.colors.accentGreen
                : theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 12,
              lineHeight: 17,
            }}>
            {item.done ? '已完成' : item.note || '已为下一次阅读准备好'}
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
