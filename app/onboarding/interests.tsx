import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUpdateProfileMutation } from '@/hooks/use-library-app-data';
import { interestTags } from '@/lib/app/mock-data';

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
    await updateProfileMutation.mutateAsync({
      interestTags: selectedTags.length ? selectedTags : [...interestTags.slice(0, 3)],
      readingProfileSummary: profile?.readingProfileSummary ?? '偏好先看章节框架，再进入细节和例题。',
    });

    router.replace('/');
  };

  return (
    <PageShell
      headerDescription="选完后，首页、推荐和书单会更贴近你的学习节奏。"
      headerTitle="选择阅读兴趣标签"
      mode="workspace"
      showBackButton>
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
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 16,
          }}>
          已选 {selectedTags.length} 个标签
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 13,
            lineHeight: 18,
          }}>
          你之后还可以在个人中心继续调整。
        </Text>
        <PillButton
          href={undefined}
          label={updateProfileMutation.isPending ? '保存中…' : '完成设置'}
          onPress={handleContinue}
          variant="accent"
        />
      </View>
    </PageShell>
  );
}
