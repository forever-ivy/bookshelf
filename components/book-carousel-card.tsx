import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  type SharedValue,
  useSharedValue,
} from 'react-native-reanimated';

import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { BooklistItem } from '@/lib/api/types';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/motion';

type BookCarouselCardProps = {
  items: BooklistItem[];
};

const coverGradients = [
  ['#C8D8FF', '#E8EEFF'],
  ['#EBCFBA', '#FAE8DB'],
  ['#D0E7D1', '#E7F8E7'],
  ['#D8D2FF', '#F2F0FF'],
] as const;

const BOOK_CARD_WIDTH = 148;
const BOOK_CARD_GAP = 14;
const BOOK_CARD_SPAN = BOOK_CARD_WIDTH + BOOK_CARD_GAP;

export function BookCarouselCard({ items }: BookCarouselCardProps) {
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
            color: bookleafTheme.colors.text,
            fontFamily: bookleafTheme.fonts.heading,
            fontSize: 26,
          }}>
          家庭书库
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            fontFamily: bookleafTheme.fonts.body,
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
        {visibleItems.map((item, index) => {
          const gradient = coverGradients[index % coverGradients.length];

          return (
            <BookCarouselItem
              gradient={gradient}
              index={index}
              key={item.id}
              item={item}
              scrollX={scrollX}
            />
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

type BookCarouselItemProps = {
  gradient: readonly [string, string];
  index: number;
  item: BooklistItem;
  scrollX: SharedValue<number>;
};

function BookCarouselItem({
  gradient,
  index,
  item,
  scrollX,
}: BookCarouselItemProps) {
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
      style={[
        {
          gap: 10,
          width: BOOK_CARD_WIDTH,
        },
        cardStyle,
      ]}>
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        style={{
          borderCurve: 'continuous',
          borderRadius: 28,
          height: 176,
          justifyContent: 'flex-end',
          overflow: 'hidden',
          padding: 16,
        }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            fontFamily: bookleafTheme.fonts.heading,
            fontSize: 20,
          }}>
          {item.title}
        </Text>
      </LinearGradient>
      <View style={{ gap: 2 }}>
        <Text
          numberOfLines={1}
          selectable
          style={{
            color: bookleafTheme.colors.text,
            fontFamily: bookleafTheme.fonts.semiBold,
            fontSize: 14,
          }}>
          {item.title}
        </Text>
        <Text
          numberOfLines={2}
          selectable
          style={{
            color: item.done
              ? bookleafTheme.colors.accentGreen
              : bookleafTheme.colors.textMuted,
            fontFamily: bookleafTheme.fonts.body,
            fontSize: 12,
            lineHeight: 17,
          }}>
          {item.done ? '已完成' : item.note || '已为下一次阅读准备好'}
        </Text>
      </View>
    </Animated.View>
  );
}
