import { Link, type Href } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { BookCover, type BookCoverTone } from '@/components/base/book-cover';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { TutorProfile, TutorSession } from '@/lib/api';

type TutorNotebookPalette = {
  cardBackground: string;
  coverAccent: string;
  coverBackground: string;
  coverGlow: string;
  coverTone: BookCoverTone;
  metaBackground: string;
  metaColor: string;
  secondaryMetaColor: string;
};

function isTutorProfilePending(profile: TutorProfile) {
  return profile.status === 'queued' || profile.status === 'processing';
}

function resolveNotebookPalette(profile: TutorProfile): TutorNotebookPalette {
  if (isTutorProfilePending(profile)) {
    return {
      cardBackground: '#FFFFFF',
      coverAccent: '#DCE7F3',
      coverBackground: '#EEF4F9',
      coverGlow: 'rgba(221, 231, 242, 0.65)',
      coverTone: 'lavender',
      metaBackground: '#F6F9FB',
      metaColor: '#4E6379',
      secondaryMetaColor: '#73869A',
    };
  }

  if (profile.sourceType === 'upload') {
    return {
      cardBackground: '#FFFFFF',
      coverAccent: '#EADBCF',
      coverBackground: '#F8F2EC',
      coverGlow: 'rgba(233, 214, 201, 0.66)',
      coverTone: 'apricot',
      metaBackground: '#FBF6F1',
      metaColor: '#8B6442',
      secondaryMetaColor: '#A07D60',
    };
  }

  return {
    cardBackground: '#FFFFFF',
    coverAccent: '#D9E5DA',
    coverBackground: '#F1F6F2',
    coverGlow: 'rgba(214, 226, 216, 0.68)',
    coverTone: 'mint',
    metaBackground: '#F5F8F5',
    metaColor: '#4D6758',
    secondaryMetaColor: '#6B8575',
  };
}

function resolveMeta(profile: TutorProfile, session?: TutorSession | null) {
  return {
    previewText:
      isTutorProfilePending(profile)
        ? profile.status === 'queued'
          ? '导学任务已入队，请稍后'
          : '正在解析文档，请稍后'
        : session?.lastMessagePreview ?? profile.persona.greeting,
    primaryMeta:
      isTutorProfilePending(profile)
        ? profile.status === 'queued'
          ? '等待开始处理'
          : '正在解析文档'
        : session?.progressLabel ?? `${Math.max(profile.curriculum.length, 1)} 个学习步骤`,
    secondaryMeta:
      isTutorProfilePending(profile)
        ? '请稍后'
        : session?.currentStepTitle ?? profile.curriculum[0]?.title ?? profile.persona.name,
    tertiaryMeta: isTutorProfilePending(profile)
      ? profile.status === 'queued'
        ? '任务排队中'
        : '文档处理中'
      : profile.persona.name,
  };
}

function TutorPosterCard({
  href,
  palette,
  profile,
  session,
}: {
  href: Href;
  palette: TutorNotebookPalette;
  profile: TutorProfile;
  session?: TutorSession | null;
}) {
  const { theme } = useAppTheme();
  const meta = resolveMeta(profile, session);

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
            height: 380,
            overflow: 'hidden',
          }}
          testID="tutor-notebook-poster-card">
          <View
            style={{
              backgroundColor: palette.coverBackground,
              height: 172,
              justifyContent: 'center',
              overflow: 'hidden',
              paddingHorizontal: theme.spacing.xl,
              paddingTop: theme.spacing.lg,
            }}>
            <View
              style={{
                backgroundColor: palette.coverAccent,
                borderRadius: 40,
                height: 118,
                left: 24,
                opacity: 0.82,
                position: 'absolute',
                right: 112,
                top: 30,
                transform: [{ rotate: '-9deg' }],
              }}
            />
            <View
              style={{
                backgroundColor: palette.coverGlow,
                borderRadius: 999,
                height: 156,
                left: 42,
                position: 'absolute',
                right: 42,
                top: 16,
              }}
            />
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 12 }}>
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderSoft,
                  borderRadius: 28,
                  borderWidth: 1,
                  boxShadow: theme.shadows.float,
                  padding: 12,
                }}>
                <BookCover
                  borderRadius={theme.radii.lg}
                  height={132}
                  seed={profile.title}
                  shellTestID="tutor-notebook-poster-cover"
                  tone={palette.coverTone}
                  width={102}
                />
              </View>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              justifyContent: 'space-between',
              paddingBottom: theme.spacing.lg,
              paddingHorizontal: theme.spacing.lg,
              paddingTop: 18,
            }}>
            <View style={{ gap: 10 }}>
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
                numberOfLines={2}
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
                borderTopColor: theme.colors.borderSoft,
                borderTopWidth: 1,
                minHeight: 60,
                paddingTop: 12,
              }}>
              <View
                style={{
                  alignItems: 'flex-end',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <View style={{ flex: 1, gap: 4, paddingRight: 10 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.semiBold,
                      fontSize: 14,
                    }}>
                    {meta.primaryMeta}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.textSoft,
                      ...theme.typography.medium,
                      fontSize: 12,
                    }}>
                    {meta.secondaryMeta}
                  </Text>
                </View>

                <View
                  style={{
                    backgroundColor: palette.metaBackground,
                    borderRadius: theme.radii.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}>
                  <Text
                    style={{
                      color: palette.metaColor,
                      ...theme.typography.medium,
                      fontSize: 11,
                    }}>
                    {meta.tertiaryMeta}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

function TutorListCard({
  href,
  palette,
  profile,
  session,
}: {
  href: Href;
  palette: TutorNotebookPalette;
  profile: TutorProfile;
  session?: TutorSession | null;
}) {
  const { theme } = useAppTheme();
  const meta = resolveMeta(profile, session);

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
            alignItems: 'center',
            backgroundColor: palette.cardBackground,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            boxShadow: theme.shadows.card,
            flexDirection: 'row',
            gap: theme.spacing.lg,
            minHeight: 136,
            overflow: 'hidden',
            padding: theme.spacing.lg,
          }}
          testID="tutor-notebook-list-card">
          <View
            style={{
              alignItems: 'center',
              backgroundColor: palette.coverBackground,
              borderRadius: 22,
              height: 102,
              justifyContent: 'center',
              overflow: 'hidden',
              width: 92,
            }}>
            <View
              style={{
                backgroundColor: palette.coverGlow,
                borderRadius: 999,
                height: 74,
                position: 'absolute',
                width: 74,
              }}
            />
            <BookCover
              borderRadius={theme.radii.md}
              height={84}
              seed={profile.title}
              shellTestID="tutor-notebook-list-cover"
              tone={palette.coverTone}
              width={62}
            />
          </View>

          <View style={{ flex: 1, gap: 10 }}>
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
                backgroundColor: palette.metaBackground,
                borderRadius: 18,
                gap: 3,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  color: palette.metaColor,
                  ...theme.typography.semiBold,
                  fontSize: 13,
                }}>
                {meta.primaryMeta}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: palette.secondaryMetaColor,
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

export function TutorNotebookCard({
  href,
  profile,
  session,
  variant = 'poster',
}: {
  href: Href;
  profile: TutorProfile;
  session?: TutorSession | null;
  variant?: 'list' | 'poster';
}) {
  const palette = resolveNotebookPalette(profile);

  if (variant === 'list') {
    return <TutorListCard href={href} palette={palette} profile={profile} session={session} />;
  }

  return <TutorPosterCard href={href} palette={palette} profile={profile} session={session} />;
}
