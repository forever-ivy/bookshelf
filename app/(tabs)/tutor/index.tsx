import Animated, { FadeInUp } from 'react-native-reanimated';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { PageShell } from '@/components/navigation/page-shell';
import { ProfileSheetTriggerButton } from '@/components/navigation/profile-sheet-trigger-button';
import { ToolbarHeaderRow } from '@/components/navigation/toolbar-header-row';
import { ToolbarProfileAction } from '@/components/navigation/toolbar-profile-action';
import { TutorCreateSheet } from '@/components/tutor/tutor-create-sheet';
import { TutorNotebookCard } from '@/components/tutor/tutor-notebook-card';
import { useHeaderChromeVisibility } from '@/hooks/use-header-chrome-visibility';
import {
  useTutorDashboardQuery,
  useTutorProfilesQuery,
  useTutorSessionsQuery,
  useUploadTutorProfileMutation,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import { useProfileSheet } from '@/providers/profile-sheet-provider';

const notebookFilters = ['全部', '最近继续', '馆藏书', '上传资料'] as const;

export default function TutorIndexRoute() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { openProfileSheet } = useProfileSheet();
  const searchParams = useLocalSearchParams<{ compose?: string }>();
  const dashboardQuery = useTutorDashboardQuery();
  const profilesQuery = useTutorProfilesQuery();
  const sessionsQuery = useTutorSessionsQuery();
  const uploadProfileMutation = useUploadTutorProfileMutation();
  const [isCreateSheetOpen, setIsCreateSheetOpen] = React.useState(false);
  const { onScroll, showHeaderChrome } = useHeaderChromeVisibility();
  const isIos = Platform.OS === 'ios';

  React.useEffect(() => {
    if (searchParams.compose === '1') {
      setIsCreateSheetOpen(true);
    }
  }, [searchParams.compose]);

  const sessionByProfileId = React.useMemo(() => {
    const sessions = sessionsQuery.data ?? [];

    return new Map(sessions.map((session) => [session.tutorProfileId, session]));
  }, [sessionsQuery.data]);

  const profiles = profilesQuery.data ?? dashboardQuery.data?.recentProfiles ?? [];
  const featuredProfiles = profiles.filter((profile) => profile.status !== 'failed').slice(0, 4);
  const continueSession = dashboardQuery.data?.continueSession ?? null;

  const handleCreated = async (createPromise: Promise<{ id: number }>) => {
    try {
      const profile = await createPromise;
      setIsCreateSheetOpen(false);
      router.push(`/tutor/${profile.id}`);
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '创建导学本失败，请稍后再试。'));
    }
  };

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
                        <View testID="tutor-header-inline-title-slot">
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
                        <View testID="tutor-header-profile-slot">
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
            height={248}
            source={appArtwork.notionTutorProgress}
            testID="tutor-artwork"
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
            每个导学本都有自己的教学角色和对话记忆，随时回来继续学。
          </Text>
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
          {notebookFilters.map((filter, index) => (
            <View
              key={filter}
              style={{
                backgroundColor: index === 0 ? theme.colors.primarySoft : theme.colors.surface,
                borderColor: index === 0 ? theme.colors.primaryStrong : theme.colors.borderStrong,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 9,
              }}>
              <Text
                style={{
                  color: index === 0 ? theme.colors.primaryStrong : theme.colors.textMuted,
                  ...theme.typography.medium,
                  fontSize: 13,
                }}>
                {filter}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle
            description="像浏览精选笔记本一样，先从最适合继续的导学本开始。"
            title="精选导学本"
          />

          <ScrollView
            horizontal
            contentContainerStyle={{ gap: theme.spacing.lg }}
            showsHorizontalScrollIndicator={false}>
            {featuredProfiles.map((profile) => (
              <View key={`featured-${profile.id}`} style={{ width: 284 }}>
                <TutorNotebookCard
                  href={`/tutor/${profile.id}`}
                  profile={profile}
                  session={sessionByProfileId.get(profile.id) ?? null}
                  variant="poster"
                />
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle
            description="把导学本当成学习工作区来回切换，最近打开的会留在这里。"
            title="最近打开"
          />

          <View
            style={{
              gap: theme.spacing.md,
            }}>
            {profiles.map((profile) => (
              <View key={`recent-${profile.id}`}>
                <TutorNotebookCard
                  href={`/tutor/${profile.id}`}
                  profile={profile}
                  session={sessionByProfileId.get(profile.id) ?? null}
                  variant="list"
                />
              </View>
            ))}
          </View>
        </View>
      </PageShell>

      <TutorCreateSheet
        creating={uploadProfileMutation.isPending}
        onClose={() => setIsCreateSheetOpen(false)}
        onDocumentPicked={(doc) =>
          handleCreated(
            (() => {
              const formData = new FormData();
              formData.append('title', doc.name);
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
