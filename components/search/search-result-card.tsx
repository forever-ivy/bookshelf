import React from 'react';
import { Link, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { Pressable, Text, View, Platform } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { BookCover } from '@/components/base/book-cover';
import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { resolveBookEtaDisplay } from '@/lib/book-delivery';
import { resolveBookLocationDisplay } from '@/lib/book-location';

type SearchResultCardProps = {
  href?: Href;
  actionLabel?: string;
  availability: string;
  author: string;
  coverTone: 'apricot' | 'blue' | 'coral' | 'lavender' | 'mint';
  eta: string;
  location: string;
  listPosition?: 'first' | 'last' | 'middle' | 'single';
  onPress?: () => void;
  reason?: string | null;
  summary?: string | null;
  title: string;
  variant?: 'card' | 'list';
};

function resolveAvailabilityPalette(
  theme: ReturnType<typeof useAppTheme>['theme'],
  availability: string
) {
  if (availability.includes('可立即借阅')) {
    return {
      backgroundColor: theme.colors.availabilityReadySoft,
      color: theme.colors.availabilityReady,
    };
  }

  if (availability.includes('自取')) {
    return {
      backgroundColor: theme.colors.availabilityPickupSoft,
      color: theme.colors.availabilityPickup,
    };
  }

  return {
    backgroundColor: theme.colors.availabilityUnavailableSoft,
    color: theme.colors.availabilityUnavailable,
  };
}

function SearchResultChevron({ color }: { color: string }) {
  if (Platform.OS === 'ios') {
    return (
      <Image
        contentFit="contain"
        source="sf:chevron.forward"
        style={{
          height: 17,
          tintColor: color,
          width: 10,
        }}
        testID="search-result-action-chevron"
      />
    );
  }

  return (
    <View testID="search-result-action-chevron">
      <AppIcon color={color} name="chevronRight" size={18} strokeWidth={2} />
    </View>
  );
}

function resolveRecommendationText(reason?: string | null) {
  const normalizedReason = reason?.trim();

  if (!normalizedReason || normalizedReason.toLowerCase() === 'nan') {
    return '猜你感兴趣';
  }

  return normalizedReason;
}

export function SearchResultCard({
  actionLabel = '查看详情并借阅',
  availability,
  author,
  coverTone,
  eta,
  href,
  listPosition = 'single',
  location,
  onPress,
  reason,
  summary,
  title,
  variant = 'card',
}: SearchResultCardProps) {
  const { theme } = useAppTheme();
  const resolvedEta = resolveBookEtaDisplay(eta);
  const resolvedLocation = resolveBookLocationDisplay(location);
  const availabilityPalette = resolveAvailabilityPalette(theme, availability);

  if (variant === 'list') {
    const recommendationText = resolveRecommendationText(reason);
    const radiusStyle =
      listPosition === 'single'
        ? {
            borderRadius: 28,
          }
        : listPosition === 'first'
          ? {
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            }
          : listPosition === 'last'
            ? {
                borderBottomLeftRadius: 28,
                borderBottomRightRadius: 28,
              }
            : null;
    const listContent = (
      <View
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: listPosition === 'first' || listPosition === 'single' ? 'transparent' : theme.colors.borderSoft,
            borderTopWidth: listPosition === 'first' || listPosition === 'single' ? 0 : 1,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 16,
          },
          radiusStyle,
        ]}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: 14,
            }}>
          <View
            style={{
              borderRadius: 14,
              height: 68,
              justifyContent: 'center',
              width: 50,
            }}
            testID="search-result-cover-shell">
            <BookCover
              borderRadius={14}
              height={68}
              imageTestID="search-result-cover-image"
              seed={title}
              shellTestID="search-result-cover-icon-shell"
              tone={coverTone}
              width={50}
            />
          </View>
          <View
            style={{
              flex: 1,
              gap: 6,
              minHeight: 58,
              justifyContent: 'center',
            }}>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 17,
                lineHeight: 22,
              }}>
              {title}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.body,
                fontSize: 12,
                lineHeight: 17,
                marginTop: 2,
              }}>
              {recommendationText}
            </Text>
          </View>
            <View
              style={{
                alignItems: 'flex-end',
                justifyContent: 'center',
                minHeight: 74,
              }}>
              <View
                style={{
                  alignItems: 'center',
                  height: 24,
                  justifyContent: 'center',
                  width: 20,
                }}
                testID="search-result-action-shell">
                <SearchResultChevron color={theme.colors.textMuted} />
              </View>
          </View>
        </View>
      </View>
    );
    const interactiveRow = (
      <Pressable
        accessibilityRole={href ? 'link' : 'button'}
        onPress={onPress}
        style={({ pressed }) => ({
          opacity: pressed ? 0.94 : 1,
        })}
        testID="search-result-cell">
        {listContent}
      </Pressable>
    );

    if (href) {
      return (
        <Link asChild href={href}>
          {interactiveRow}
        </Link>
      );
    }

    return (
      interactiveRow
    );
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 28,
        boxShadow: theme.shadows.card,
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
      }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <View
          style={{
            justifyContent: 'center',
          }}>
          <BookCover borderRadius={theme.radii.md} height={92} seed={title} tone={coverTone} width={68} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: availabilityPalette.backgroundColor,
              borderRadius: theme.radii.md,
              paddingHorizontal: 8,
              paddingVertical: 5,
            }}>
            <Text
              style={{
                color: availabilityPalette.color,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              {availability}
            </Text>
          </View>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 18,
              lineHeight: 22,
            }}>
            {title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 13,
            }}>
            {author}
          </Text>
        </View>
      </View>

      <View
        style={{
          borderTopColor: theme.colors.borderSoft,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: theme.spacing.md,
          justifyContent: 'space-between',
          paddingTop: theme.spacing.md,
        }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            馆藏位置
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {resolvedLocation}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            最快到手
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {resolvedEta}
          </Text>
        </View>
      </View>

      {reason ? (
        <View
          style={{
            backgroundColor: theme.colors.primarySoft,
            borderRadius: theme.radii.md,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}>
          <Text
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.medium,
              fontSize: 12,
              lineHeight: 18,
            }}>
            为什么可能适合你 · {reason}
          </Text>
        </View>
      ) : null}

      {summary ? (
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 13,
            lineHeight: 19,
          }}>
          {summary}
        </Text>
      ) : null}

      <PillButton href={href} label={actionLabel} onPress={onPress} variant="accent" />
    </View>
  );
}
