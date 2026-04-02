import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { PillButton } from '@/components/base/pill-button';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUpdateProfileMutation } from '@/hooks/use-library-app-data';
import { appArtwork } from '@/lib/app/artwork';
import { interestTags } from '@/lib/app/mock-data';
import { getLibraryErrorMessage } from '@/lib/api/client';

export default function OnboardingInterestsRoute() {
  const { bootstrapStatus, onboarding, profile, token } = useAppSession();
  const { theme } = useAppTheme();
  const router = useRouter();
  const updateProfileMutation = useUpdateProfileMutation();
  const [selectedTags, setSelectedTags] = React.useState<string[]>(profile?.interestTags ?? []);

  if (bootstrapStatus !== 'ready') {
    return null;
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  if (onboarding?.completed) {
    return <Redirect href="/" />;
  }

  if (onboarding?.needsProfileBinding) {
    return <Redirect href="/onboarding/profile" />;
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  };

  const handleContinue = async () => {
    try {
      await updateProfileMutation.mutateAsync({
        interestTags: selectedTags.length ? selectedTags : [...interestTags.slice(0, 3)],
        readingProfileSummary: profile?.readingProfileSummary ?? '偏好先看章节框架，再进入细节和例题。',
      });

      router.replace('/');
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '兴趣标签保存失败，请确认登录状态和 readers 接口状态。'));
    }
  };

  return (
    <PageShell mode="workspace">
      <View style={{ gap: theme.spacing.lg }}>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          选一些你常借的主题，之后找书、推荐借阅和专题书单会更贴近你。
        </Text>
        <EditorialIllustration
          height={184}
          source={appArtwork.notionInterestSelectionFocused}
          testID="onboarding-interest-artwork"
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {interestTags.map((tag) => {
          const selected = selectedTags.includes(tag);

          return (
            <Pressable
              key={tag}
              onPress={() => toggleTag(tag)}
              style={{
                backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                borderColor: selected ? theme.colors.primaryStrong : theme.colors.borderStrong,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
              <Text
                style={{
                  color: selected ? theme.colors.primaryStrong : theme.colors.textMuted,
                  ...theme.typography.semiBold,
                  fontSize: 13,
                }}>
                {tag}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.md,
          padding: theme.spacing.xl,
        }}>
        <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.medium, fontSize: 13 }}>
          第 2 步，共 2 步
        </Text>

        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 16,
          }}>
          已选 {selectedTags.length} 个偏好
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 13,
            lineHeight: 18,
          }}>
          之后还可以在“我的”里继续调整。
        </Text>
        <PillButton
          href={undefined}
          label={updateProfileMutation.isPending ? '保存中…' : '完成建档，进入首页'}
          onPress={handleContinue}
          variant="accent"
        />
      </View>
    </PageShell>
  );
}
