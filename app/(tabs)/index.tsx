import { Link } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import React from 'react';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { MarkerHighlightText } from '@/components/base/marker-highlight-text';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { SoftSearchBar } from '@/components/base/soft-search-bar';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';
import { homeHero, homeLearningFocus, homeQuickActions, homeShelves } from '@/lib/app/mock-data';

export default function HomeRoute() {
  const { theme } = useAppTheme();
  const chipPalettes = [
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
  ] as const;
  const actionPalettes = [
    { iconBackground: theme.colors.primarySoft, iconColor: theme.colors.primaryStrong, metaColor: theme.colors.primaryStrong },
    { iconBackground: theme.colors.warningSoft, iconColor: theme.colors.warning, metaColor: theme.colors.warning },
    { iconBackground: theme.colors.successSoft, iconColor: theme.colors.success, metaColor: theme.colors.success },
  ] as const;

  return (
    <PageShell mode="discovery">
      <View style={{ gap: theme.spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.medium,
            fontSize: 11,
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}>
          {homeHero.eyebrow}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 30,
            letterSpacing: -0.6,
          }}>
          {homeHero.title}
        </Text>
        <MarkerHighlightText
          highlight="今晚最该开始的一章"
          text={homeHero.subtitle}
          textStyle={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 20,
          }}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {homeHero.chips.map((chip, index) => {
            const palette = chipPalettes[index % chipPalettes.length];

            return (
              <View
                key={chip}
                style={{
                  backgroundColor: palette.backgroundColor,
                  borderRadius: theme.radii.md,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}>
                <Text
                  style={{
                    color: palette.color,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {chip}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <Animated.View entering={FadeInUp.delay(60).duration(480)}>
        <EditorialIllustration
          height={214}
          source={appArtwork.notionReadingProgress}
          testID="home-artwork"
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(480)}>
        <Link asChild href="/search">
          <View>
            <SoftSearchBar />
          </View>
        </Link>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(140).duration(560)}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            overflow: 'hidden',
          }}>
          {homeQuickActions.map((item, index) => (
            (() => {
              const palette = actionPalettes[index % actionPalettes.length];

              return (
            <View
              key={item.title}
              style={{
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                flexDirection: 'row',
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: palette.iconBackground,
                  borderRadius: theme.radii.md,
                  height: 34,
                  justifyContent: 'center',
                  width: 34,
                }}>
                <AppIcon color={palette.iconColor} name={item.icon} size={15} strokeWidth={1.7} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 15,
                  }}>
                  {item.title}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 18,
                  }}>
                  {item.description}
                </Text>
              </View>
              <Text
                style={{
                  color: palette.metaColor,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                {item.meta}
              </Text>
            </View>
              );
            })()
          ))}
        </View>
      </Animated.View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle
          descriptionHighlight="最短路径"
          description={homeLearningFocus.summary}
          title={homeLearningFocus.title}
        />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}>
          {homeLearningFocus.bullets.map((item, index) => (
            <View
              key={item}
              style={{
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                flexDirection: 'row',
                gap: theme.spacing.md,
                paddingTop: index === 0 ? 0 : theme.spacing.lg,
              }}>
              <View
                style={{
                  backgroundColor: theme.colors.primaryStrong,
                  borderRadius: theme.radii.pill,
                  height: 6,
                  marginTop: 7,
                  width: 6,
                }}
              />
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.medium,
                  flex: 1,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                {item}
              </Text>
            </View>
          ))}
          <Link asChild href="/borrowing">
            <View>
              <PillButton icon="bookmark" label={homeHero.primaryCta} variant="accent" />
            </View>
          </Link>
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle
          descriptionHighlight="直接开始"
          description="从能借到、能送到、适合课程的起点里直接开始。"
          title="推荐起点"
        />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            overflow: 'hidden',
          }}>
          {homeShelves.flatMap((group) => group.items).map((item, index) => (
            <View
              key={item.title}
              style={{
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                gap: 4,
                padding: theme.spacing.lg,
              }}>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                {item.kicker}
              </Text>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
                }}>
                {item.title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                  lineHeight: 18,
                }}>
                {item.description}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </PageShell>
  );
}
