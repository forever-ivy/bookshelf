import React from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AppIcon } from '@/components/base/app-icon';
import { BookCover } from '@/components/base/book-cover';
import { useAppTheme } from '@/hooks/use-app-theme';

type FavoriteBookCardProps = {
  actionLabel?: string;
  availabilityLabel?: string | null;
  author: string;
  coverTone: 'apricot' | 'blue' | 'coral' | 'lavender' | 'mint';
  href?: Href;
  onPress?: () => void;
  summary?: string | null;
  title: string;
};

function resolveSummary(summary?: string | null, title?: string) {
  const normalizedSummary = summary?.trim();

  if (normalizedSummary && normalizedSummary !== title?.trim()) {
    return normalizedSummary;
  }

  return '暂无摘要';
}

export function FavoriteBookCard({
  actionLabel = '查看详情',
  availabilityLabel,
  author,
  coverTone,
  href,
  onPress,
  summary,
  title,
}: FavoriteBookCardProps) {
  const { theme } = useAppTheme();
  const resolvedSummary = resolveSummary(summary, title);
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);
  const [summaryExpandable, setSummaryExpandable] = React.useState(false);
  const resolvedStatusLabel = availabilityLabel?.trim() || '馆藏信息待同步';
  const summaryChevronRotation = useSharedValue(0);

  React.useEffect(() => {
    summaryChevronRotation.value = withTiming(summaryExpanded ? 180 : 0, {
      duration: 220,
      easing: Easing.inOut(Easing.ease),
    });
  }, [summaryChevronRotation, summaryExpanded]);

  const summaryChevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${summaryChevronRotation.value}deg` }],
  }));

  const handleSummaryPress = React.useCallback(() => {
    if (!summaryExpandable) {
      return;
    }

    setSummaryExpanded((value) => !value);
  }, [summaryExpandable]);

  const action = (
    <Pressable
      accessibilityRole={href ? 'link' : 'button'}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
      testID="favorite-book-card-action">
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 6,
          justifyContent: 'center',
          minHeight: 28,
        }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 15,
          }}>
          {actionLabel}
        </Text>
        <View testID="favorite-book-card-detail-chevron">
          <AppIcon color={theme.colors.text} name="chevronRight" size={16} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
      }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <View style={{ justifyContent: 'center' }} testID="favorite-book-card-cover">
          <BookCover borderRadius={theme.radii.md} height={92} seed={title} tone={coverTone} width={68} />
        </View>

        <View style={{ flex: 1, gap: 10, justifyContent: 'center' }}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 18,
              lineHeight: 24,
            }}>
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 21,
            }}>
            {author}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={handleSummaryPress}
            style={({ pressed }) => ({
              opacity: pressed ? 0.92 : 1,
            })}
            testID="favorite-book-card-summary">
            <Animated.View
              layout={LinearTransition.duration(220)}
              style={{
                alignItems: 'flex-end',
                flexDirection: 'row',
                gap: 6,
                position: 'relative',
              }}>
              <Text
                onTextLayout={(event) => {
                  setSummaryExpandable(event.nativeEvent.lines.length > 2);
                }}
                style={{
                  color: 'transparent',
                  ...theme.typography.body,
                  left: 0,
                  opacity: 0,
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  zIndex: -1,
                  fontSize: 14,
                  lineHeight: 21,
                }}
                testID="favorite-book-card-summary-measure">
                {resolvedSummary}
              </Text>
              <Text
                ellipsizeMode="clip"
                numberOfLines={summaryExpanded ? undefined : 2}
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 21,
                }}
                testID="favorite-book-card-summary-text">
                {resolvedSummary}
              </Text>
              {summaryExpandable ? (
                <Animated.View style={summaryChevronStyle} testID="favorite-book-card-summary-chevron">
                  <AppIcon color={theme.colors.textSoft} name="chevronDown" size={16} strokeWidth={2} />
                </Animated.View>
              ) : null}
            </Animated.View>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          alignItems: 'center',
          borderTopColor: theme.colors.borderSoft,
          borderTopWidth: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingTop: theme.spacing.md,
        }}>
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: theme.colors.primarySoft,
            borderRadius: theme.radii.pill,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {resolvedStatusLabel}
          </Text>
        </View>

      {href ? (
        <Link asChild href={href}>
          {action}
        </Link>
      ) : (
        action
      )}
      </View>
    </Animated.View>
  );
}
