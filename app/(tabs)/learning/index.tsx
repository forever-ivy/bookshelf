import Animated, { FadeInUp } from 'react-native-reanimated';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { LearningCreateSheet } from '@/components/learning/learning-create-sheet';
import { LearningNotebookCard } from '@/components/learning/learning-notebook-card';
import { PageShell } from '@/components/navigation/page-shell';
import { ProfileSheetTriggerButton } from '@/components/navigation/profile-sheet-trigger-button';
import { ToolbarHeaderRow } from '@/components/navigation/toolbar-header-row';
import { ToolbarProfileAction } from '@/components/navigation/toolbar-profile-action';
import { useHeaderChromeVisibility } from '@/hooks/use-header-chrome-visibility';
import {
  useLearningProfilesQuery,
  useLearningSessionsQuery,
  useUploadLearningProfileMutation,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import { useProfileSheet } from '@/providers/profile-sheet-provider';

const notebookFilters = ['全部', '最近继续', '馆藏书', '上传资料'] as const;

function LibrarySummaryStat({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: 'neutral' | 'warning';
  value: number;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: tone === 'warning' ? theme.colors.warningSoft : theme.colors.surface,
        borderColor: theme.colors.borderSoft,
        borderRadius: 18,
        borderWidth: 1,
        flex: 1,
        gap: 6,
        minHeight: 84,
        padding: 14,
      }}>
      <Text
        style={{
          color: theme.colors.textSoft,
          ...theme.typography.semiBold,
          fontSize: 12,
        }}>
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.bold,
          fontSize: 24,
        }}>
        {value}
      </Text>
    </View>
  );
}

export default function LearningIndexRoute() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { openProfileSheet } = useProfileSheet();
  const searchParams = useLocalSearchParams<{ compose?: string }>();
  const profilesQuery = useLearningProfilesQuery();
  const sessionsQuery = useLearningSessionsQuery();
  const uploadProfileMutation = useUploadLearningProfileMutation();
  const [activeFilter, setActiveFilter] =
    React.useState<(typeof notebookFilters)[number]>('全部');
  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false);
  const { onScroll, showHeaderChrome } = useHeaderChromeVisibility();
  const isIos = Platform.OS === 'ios';

  React.useEffect(() => {
    if (searchParams.compose === '1') {
      setIsCreateSheetOpen(true);
    }
  }, [searchParams.compose]);

  const sessionByProfileId = React.useMemo(() => {
    const sessions = [...(sessionsQuery.data ?? [])].sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );

    return sessions.reduce((map, session) => {
      if (!map.has(session.learningProfileId)) {
        map.set(session.learningProfileId, session);
      }

      return map;
    }, new Map<number, (typeof sessions)[number]>());
  }, [sessionsQuery.data]);

  const profiles = React.useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const sortedProfiles = React.useMemo(
    () =>
      [...profiles].sort((left, right) => {
        const timeDelta = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        return timeDelta === 0 ? right.id - left.id : timeDelta;
      }),
    [profiles]
  );

  const filteredProfiles = React.useMemo(() => {
    switch (activeFilter) {
      case '最近继续':
        return sortedProfiles.filter((profile) => sessionByProfileId.has(profile.id));
      case '馆藏书':
        return sortedProfiles.filter((profile) => profile.sourceType === 'book');
      case '上传资料':
        return sortedProfiles.filter((profile) => profile.sourceType === 'upload');
      case '全部':
      default:
        return sortedProfiles;
    }
  }, [activeFilter, sessionByProfileId, sortedProfiles]);

  const featuredProfiles = React.useMemo(() => {
    const withActiveSessions = filteredProfiles.filter((profile) => sessionByProfileId.has(profile.id));
    const withoutActiveSessions = filteredProfiles.filter((profile) => !sessionByProfileId.has(profile.id));

    return [...withActiveSessions, ...withoutActiveSessions]
      .filter((profile) => profile.status !== 'failed')
      .slice(0, 4);
  }, [filteredProfiles, sessionByProfileId]);

  const readyCount = React.useMemo(
    () => profiles.filter((profile) => profile.status === 'ready').length,
    [profiles]
  );
  const processingCount = React.useMemo(
    () => profiles.filter((profile) => profile.status === 'queued' || profile.status === 'processing').length,
    [profiles]
  );
  const failedCount = React.useMemo(
    () => profiles.filter((profile) => profile.status === 'failed').length,
    [profiles]
  );

  const handleCreated = async (createPromise: Promise<{ id: number }>) => {
    try {
      const profile = await createPromise;
      setIsCreateSheetOpen(false);
      router.push(`/learning/${profile.id}/guide`);
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '创建导学本失败，请稍后再试。'));
    }
  };

  const renderEmptyState = () => (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        gap: theme.spacing.md,
        padding: theme.spacing.xl,
      }}>
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.semiBold,
          fontSize: 18,
        }}>
        {profiles.length === 0 ? '还没有导学本' : `“${activeFilter}” 里还没有内容`}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 14,
          lineHeight: 21,
        }}>
        {profiles.length === 0
          ? '从一本馆藏书或一份上传资料开始，很快就能生成自己的导学工作区。'
          : '可以切换筛选，或者直接新建一个新的导学本。'}
      </Text>
      <PillButton
        fullWidth
        icon="plus"
        label="新建导学本"
        onPress={() => setIsCreateSheetOpen(true)}
        variant="accent"
      />
    </View>
  );

  return (
    <>
      {isIos ? (
        <Stack.Screen
          options={{
            title: '',
            unstable_headerLeftItems: () =>
              showHeaderChrome
                ? [
                    {
                      element: (
                        <View testID="learning-header-inline-title-slot">
                          <ToolbarHeaderRow title="导学" />
                        </View>
                      ),
                      hidesSharedBackground: true,
                      type: 'custom' as const,
                    },
                  ]
                : [],
            unstable_headerRightItems: () =>
              showHeaderChrome
                ? [
                    {
                      element: (
                        <View testID="learning-header-profile-slot">
                          <ToolbarProfileAction onPress={openProfileSheet} />
                        </View>
                      ),
                      hidesSharedBackground: true,
                      type: 'custom' as const,
                    },
                  ]
                : [],
          }}
        />
      ) : (
        <Stack.Screen
          options={{
            headerRight: () =>
              showHeaderChrome ? <ProfileSheetTriggerButton onPress={openProfileSheet} /> : null,
            title: showHeaderChrome ? '导学' : '',
          }}
        />
      )}

      <PageShell mode="workspace" onScroll={onScroll}>
        <Animated.View entering={FadeInUp.delay(60).duration(480)}>
          <EditorialIllustration
            height={220}
            source={appArtwork.notionLearningProgress}
            testID="learning-artwork"
          />
        </Animated.View>

        <View
          style={{
            backgroundColor: theme.colors.surfaceKnowledge,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}>
          <Text
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.medium,
              fontSize: 11,
              letterSpacing: 0.3,
              textTransform: 'uppercase',
            }}>
            导学本库
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 28,
              lineHeight: 34,
            }}>
            定制你的导师
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 22,
            }}>
            首页优先展示导学本本身和学习状态，让你更快找到值得继续的那一本。
          </Text>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <LibrarySummaryStat label="已就绪" value={readyCount} />
            <LibrarySummaryStat label="处理中" value={processingCount} />
            <LibrarySummaryStat label="需关注" tone="warning" value={failedCount} />
          </View>

          <PillButton
            fullWidth
            icon="plus"
            label="新建导学本"
            onPress={() => setIsCreateSheetOpen(true)}
            size="hero"
            variant="soft"
          />
        </View>

        <ScrollView
          horizontal
          contentContainerStyle={{ gap: theme.spacing.sm }}
          showsHorizontalScrollIndicator={false}>
          {notebookFilters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <Pressable
                key={filter}
                accessibilityRole="button"
                onPress={() => setActiveFilter(filter)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.78 : 1,
                })}>
                <View
                  style={{
                    backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface,
                    borderColor: isActive ? theme.colors.primaryStrong : theme.colors.borderStrong,
                    borderRadius: theme.radii.pill,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                  }}>
                  <Text
                    style={{
                      color: isActive ? theme.colors.primaryStrong : theme.colors.textMuted,
                      ...theme.typography.medium,
                      fontSize: 13,
                    }}>
                    {filter}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {featuredProfiles.length > 0 ? (
          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle
              description="优先把可继续推进的导学本放在前面，像浏览精选学习工作区。"
              title="精选导学本"
            />

            <ScrollView
              horizontal
              contentContainerStyle={{ gap: theme.spacing.lg }}
              showsHorizontalScrollIndicator={false}>
              {featuredProfiles.map((profile) => (
                <View key={`featured-${profile.id}`} style={{ width: 284 }}>
                  <LearningNotebookCard
                    href={`/learning/${profile.id}/guide`}
                    profile={profile}
                    session={sessionByProfileId.get(profile.id) ?? null}
                    variant="poster"
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle
            description="最近打开的导学本会保留在这里，方便你直接回到对应工作区。"
            title="最近打开"
          />

          {filteredProfiles.length > 0 ? (
            <View style={{ gap: theme.spacing.md }}>
              {filteredProfiles.map((profile) => (
                <LearningNotebookCard
                  key={`recent-${profile.id}`}
                  href={`/learning/${profile.id}/guide`}
                  profile={profile}
                  session={sessionByProfileId.get(profile.id) ?? null}
                  variant="list"
                />
              ))}
            </View>
          ) : (
            renderEmptyState()
          )}
        </View>
      </PageShell>

      <LearningCreateSheet
        creating={uploadProfileMutation.isPending}
        onClose={() => setIsCreateSheetOpen(false)}
        onDocumentPicked={(doc) =>
          handleCreated(
            (() => {
              const formData = new FormData();
              formData.append(
                'file',
                {
                  name: doc.name,
                  type: doc.mimeType ?? 'application/octet-stream',
                  uri: doc.uri,
                } as unknown as Blob
              );
              return uploadProfileMutation.mutateAsync(formData);
            })()
          )
        }
        visible={isCreateSheetOpen}
      />
    </>
  );
}
