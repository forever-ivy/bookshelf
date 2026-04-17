import { Link, type Href } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { BookCover, type BookCoverTone } from '@/components/base/book-cover';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { LearningProfile, LearningSession } from '@/lib/api';

type LearningNotebookPalette = {
  cardBackground: string;
  coverAccent: string;
  coverBackground: string;
  coverGlow: string;
  coverTone: BookCoverTone;
  infoBackground: string;
  infoColor: string;
  mutedColor: string;
  statusBackground: string;
};

type LearningNotebookMeta = {
  previewText: string;
  primaryMeta: string;
  secondaryMeta: string;
  sourceLabel: string;
  statusLabel: string;
  tertiaryMeta: string;
};

function isLearningProfilePending(profile: LearningProfile) {
  return profile.status === 'queued' || profile.status === 'processing';
}

function hasStartedGeneration(profile: LearningProfile) {
  return (profile.latestJob?.attemptCount ?? 0) > 0;
}

function resolveNotebookPalette(profile: LearningProfile): LearningNotebookPalette {
  if (profile.status === 'failed') {
    return {
      cardBackground: '#FFFFFF',
      coverAccent: '#F0DDD8',
      coverBackground: '#FBF4F1',
      coverGlow: 'rgba(238, 214, 206, 0.7)',
      coverTone: 'apricot',
      infoBackground: '#FBF2EF',
      infoColor: '#8C5A4E',
      mutedColor: '#A07669',
      statusBackground: '#FDE8E4',
    };
  }

  if (isLearningProfilePending(profile)) {
    return {
      cardBackground: '#FFFFFF',
      coverAccent: '#DCE7F3',
      coverBackground: '#EEF4F9',
      coverGlow: 'rgba(221, 231, 242, 0.65)',
      coverTone: 'lavender',
      infoBackground: '#F4F8FB',
      infoColor: '#4E6379',
      mutedColor: '#73869A',
      statusBackground: '#EDF4FB',
    };
  }

  if (profile.sourceType === 'upload') {
    return {
      cardBackground: '#FFFFFF',
      coverAccent: '#EADBCF',
      coverBackground: '#F8F2EC',
      coverGlow: 'rgba(233, 214, 201, 0.66)',
      coverTone: 'apricot',
      infoBackground: '#FBF6F1',
      infoColor: '#8B6442',
      mutedColor: '#A07D60',
      statusBackground: '#F7EFE7',
    };
  }

  return {
    cardBackground: '#FFFFFF',
    coverAccent: '#D9E5DA',
    coverBackground: '#F1F6F2',
    coverGlow: 'rgba(214, 226, 216, 0.68)',
    coverTone: 'mint',
    infoBackground: '#F5F8F5',
    infoColor: '#4D6758',
    mutedColor: '#6B8575',
    statusBackground: '#EEF5EF',
  };
}

function resolveNotebookMeta(
  profile: LearningProfile,
  session?: LearningSession | null
): LearningNotebookMeta {
  const sourceLabel = profile.sourceType === 'upload' ? '上传资料' : '馆藏书';

  if (profile.status === 'failed') {
    return {
      previewText: profile.failureMessage ?? profile.latestJob?.errorMessage ?? '这次生成失败了，请稍后重试。',
      primaryMeta: '生成失败，可重试',
      secondaryMeta: profile.latestJob?.errorMessage ?? '返回导学本库后可以重新生成',
      sourceLabel,
      statusLabel: '失败',
      tertiaryMeta: '生成失败',
    };
  }

  if (isLearningProfilePending(profile) && !hasStartedGeneration(profile)) {
    return {
      previewText: '导学任务还没有真正开始，你可以重新触发生成。',
      primaryMeta: '等待触发',
      secondaryMeta: '可重试',
      sourceLabel,
      statusLabel: '待启动',
      tertiaryMeta: '尚未启动',
    };
  }

  if (isLearningProfilePending(profile)) {
    return {
      previewText: '正在解析文档，请稍后。',
      primaryMeta: '正在解析',
      secondaryMeta: '请稍后',
      sourceLabel,
      statusLabel: '处理中',
      tertiaryMeta: '后台处理中',
    };
  }

  return {
    previewText: session?.lastMessagePreview ?? profile.persona.greeting,
    primaryMeta: session?.progressLabel ?? `${Math.max(profile.curriculum.length, 1)} 个学习步骤`,
    secondaryMeta: session?.currentStepTitle ?? profile.curriculum[0]?.title ?? profile.persona.name,
    sourceLabel,
    statusLabel: session ? '最近继续' : '已就绪',
    tertiaryMeta: profile.persona.name,
  };
}

function NotebookChip({
  backgroundColor,
  color,
  label,
}: {
  backgroundColor: string;
  color: string;
  label: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor,
        borderRadius: theme.radii.pill,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}>
      <Text
        style={{
          color,
          ...theme.typography.medium,
          fontSize: 11,
        }}>
        {label}
      </Text>
    </View>
  );
}

function LearningPosterCard({
  href,
  palette,
  profile,
  session,
}: {
  href: Href;
  palette: LearningNotebookPalette;
  profile: LearningProfile;
  session?: LearningSession | null;
}) {
  const { theme } = useAppTheme();
  const meta = resolveNotebookMeta(profile, session);

  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => ({
          opacity: pressed ? 0.96 : 1,
          transform: [{ scale: pressed ? 0.992 : 1 }],
        })}>
        <View
          style={{
            backgroundColor: palette.cardBackground,
            borderColor: theme.colors.borderStrong,
            borderRadius: 30,
            borderWidth: 1,
            boxShadow: theme.shadows.card,
            height: 362,
            overflow: 'hidden',
            padding: theme.spacing.lg,
          }}
          testID="learning-notebook-poster-card">
          <View style={{ alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' }}>
            <NotebookChip
              backgroundColor={theme.colors.surfaceTint}
              color={theme.colors.textSoft}
              label={meta.sourceLabel}
            />
            <NotebookChip
              backgroundColor={palette.statusBackground}
              color={palette.infoColor}
              label={meta.statusLabel}
            />
          </View>

          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.coverBackground,
              borderRadius: 26,
              height: 142,
              justifyContent: 'center',
              marginTop: 16,
              overflow: 'hidden',
              position: 'relative',
            }}>
            <View
              style={{
                backgroundColor: palette.coverAccent,
                borderRadius: 30,
                height: 96,
                left: 20,
                opacity: 0.8,
                position: 'absolute',
                right: 108,
                top: 18,
                transform: [{ rotate: '-8deg' }],
              }}
            />
            <View
              style={{
                backgroundColor: palette.coverGlow,
                borderRadius: 999,
                height: 132,
                position: 'absolute',
                width: 132,
              }}
            />
            <BookCover
              borderRadius={theme.radii.lg}
              height={108}
              seed={profile.title}
              shellTestID="learning-notebook-poster-cover"
              tone={palette.coverTone}
              width={82}
            />
          </View>

          <View style={{ flex: 1, gap: 12, marginTop: 18 }}>
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 22,
                lineHeight: 28,
              }}>
              {profile.title}
            </Text>
            <Text
              numberOfLines={3}
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              {meta.previewText}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: palette.infoBackground,
              borderRadius: 22,
              gap: 6,
              marginTop: 16,
              paddingHorizontal: 14,
              paddingVertical: 14,
            }}>
            <Text
              numberOfLines={1}
              style={{
                color: palette.infoColor,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              {meta.primaryMeta}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: palette.mutedColor,
                ...theme.typography.medium,
                fontSize: 12,
              }}>
              {meta.secondaryMeta}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                color: palette.mutedColor,
                ...theme.typography.medium,
                fontSize: 11,
              }}>
              {meta.tertiaryMeta}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function LearningListCard({
  href,
  palette,
  profile,
  session,
}: {
  href: Href;
  palette: LearningNotebookPalette;
  profile: LearningProfile;
  session?: LearningSession | null;
}) {
  const { theme } = useAppTheme();
  const meta = resolveNotebookMeta(profile, session);

  return (
    <Link asChild href={href}>
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => ({
          opacity: pressed ? 0.96 : 1,
          transform: [{ scale: pressed ? 0.996 : 1 }],
        })}>
        <View
          style={{
            backgroundColor: palette.cardBackground,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            boxShadow: theme.shadows.card,
            flexDirection: 'row',
            gap: theme.spacing.lg,
            minHeight: 164,
            overflow: 'hidden',
            padding: theme.spacing.lg,
          }}
          testID="learning-notebook-list-card">
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.coverBackground,
              borderRadius: 24,
              height: 112,
              justifyContent: 'center',
              overflow: 'hidden',
              width: 94,
            }}>
            <View
              style={{
                backgroundColor: palette.coverGlow,
                borderRadius: 999,
                height: 78,
                position: 'absolute',
                width: 78,
              }}
            />
            <BookCover
              borderRadius={theme.radii.md}
              height={88}
              seed={profile.title}
              shellTestID="learning-notebook-list-cover"
              tone={palette.coverTone}
              width={64}
            />
          </View>

          <View style={{ flex: 1, gap: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <NotebookChip
                backgroundColor={theme.colors.surfaceTint}
                color={theme.colors.textSoft}
                label={meta.sourceLabel}
              />
              <NotebookChip
                backgroundColor={palette.statusBackground}
                color={palette.infoColor}
                label={meta.statusLabel}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.text,
                  ...theme.typography.heading,
                  fontSize: 20,
                  lineHeight: 25,
                }}>
                {profile.title}
              </Text>
              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                {meta.previewText}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: palette.infoBackground,
                borderRadius: 18,
                gap: 4,
                marginTop: 'auto',
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  color: palette.infoColor,
                  ...theme.typography.semiBold,
                  fontSize: 13,
                }}>
                {meta.primaryMeta}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: palette.mutedColor,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                {meta.secondaryMeta}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

export function LearningNotebookCard({
  href,
  profile,
  session,
  variant = 'poster',
}: {
  href: Href;
  profile: LearningProfile;
  session?: LearningSession | null;
  variant?: 'list' | 'poster';
}) {
  const palette = resolveNotebookPalette(profile);

  if (variant === 'list') {
    return <LearningListCard href={href} palette={palette} profile={profile} session={session} />;
  }

  return <LearningPosterCard href={href} palette={palette} profile={profile} session={session} />;
}
