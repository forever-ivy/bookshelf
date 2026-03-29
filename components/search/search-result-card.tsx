import React from 'react';
import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';

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

function coverColor(tone: SearchResultCardProps['coverTone']) {
  switch (tone) {
    case 'mint':
      return '#B8E2CF';
    case 'apricot':
      return '#F4C8A8';
    case 'lavender':
      return '#D9D6FF';
    case 'coral':
      return '#F6D0C9';
    default:
      return '#DCE7FF';
  }
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
  const availabilityPalette =
    availability.includes('可立即借阅')
      ? { backgroundColor: theme.colors.successSoft, color: theme.colors.success }
      : availability.includes('自取')
        ? { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong }
        : { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning };

  if (variant === 'list') {
    const radiusStyle =
      listPosition === 'single'
        ? {
            borderRadius: theme.radii.xl,
          }
        : listPosition === 'first'
          ? {
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            }
          : listPosition === 'last'
            ? {
                borderBottomLeftRadius: theme.radii.xl,
                borderBottomRightRadius: theme.radii.xl,
              }
            : null;

    return (
      <View
        style={[
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: listPosition === 'first' || listPosition === 'single' ? 'transparent' : theme.colors.borderSoft,
            borderTopWidth: listPosition === 'first' || listPosition === 'single' ? 0 : 1,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
          },
          radiusStyle,
        ]}
        testID="search-result-cell">
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View
            style={{
              backgroundColor: coverColor(coverTone),
              borderRadius: theme.radii.md,
              height: 58,
              justifyContent: 'space-between',
              padding: 8,
              width: 44,
            }}>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.68)',
                borderRadius: theme.radii.sm,
                height: 6,
                width: '72%',
              }}
            />
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.82)',
                borderRadius: theme.radii.sm,
                height: 16,
                width: 16,
              }}
            />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: theme.spacing.sm,
              }}>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: availabilityPalette.backgroundColor,
                  borderRadius: theme.radii.md,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}>
                <Text
                  style={{
                    color: availabilityPalette.color,
                    ...theme.typography.medium,
                    fontSize: 11,
                  }}>
                  {availability}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                  flex: 1,
                }}>
                {eta}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                    lineHeight: 20,
                  }}>
                  {title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                  }}>
                  {author}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.body,
                    fontSize: 12,
                  }}>
                  {reason ? `推荐解释 · ${reason}` : location}
                </Text>
              </View>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppIcon color={theme.colors.textSoft} name="chevronRight" size={16} strokeWidth={1.7} />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
      }}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <View
          style={{
            backgroundColor: coverColor(coverTone),
            borderRadius: theme.radii.md,
            height: 92,
            justifyContent: 'space-between',
            padding: 10,
            width: 68,
          }}>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.68)',
              borderRadius: theme.radii.sm,
              height: 8,
              width: '74%',
            }}
          />
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.82)',
              borderRadius: theme.radii.sm,
              height: 24,
              width: 22,
            }}
          />
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
            履约方式
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {eta}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            所在位置
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {location}
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
            推荐解释 · {reason}
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
