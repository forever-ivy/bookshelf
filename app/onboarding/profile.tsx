import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Text, TextInput, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUpdateProfileMutation } from '@/hooks/use-library-app-data';

export default function OnboardingProfileRoute() {
  const { bootstrapStatus, onboarding, profile, token } = useAppSession();
  const { theme } = useAppTheme();
  const router = useRouter();
  const updateProfileMutation = useUpdateProfileMutation();
  const [college, setCollege] = React.useState(profile?.college ?? '信息与电气工程学院');
  const [major, setMajor] = React.useState(profile?.major ?? '人工智能');
  const [gradeYear, setGradeYear] = React.useState(profile?.gradeYear ?? '2023');
  const [displayName, setDisplayName] = React.useState(profile?.displayName ?? '陈知行');

  if (bootstrapStatus !== 'ready') {
    return null;
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  if (onboarding?.completed) {
    return <Redirect href="/" />;
  }

  const handleContinue = async () => {
    const nextSession = await updateProfileMutation.mutateAsync({
      college,
      displayName,
      gradeYear,
      major,
      readingProfileSummary:
        profile?.readingProfileSummary ?? '偏好先看章节框架，再进入细节和例题。',
    });

    router.replace(nextSession.onboarding.needsInterestSelection ? '/onboarding/interests' : '/');
  };

  return (
    <PageShell
      headerDescription="这一步会影响首页推荐、考试专区和课程配套结果。"
      headerTitle="绑定学院、专业、年级"
      mode="workspace"
      showBackButton>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        }}>
        {[
          ['姓名', displayName, setDisplayName],
          ['学院', college, setCollege],
          ['专业', major, setMajor],
          ['年级', gradeYear, setGradeYear],
        ].map(([label, value, setter]) => (
          <View key={label as string} style={{ gap: 8 }}>
            <Text style={{ color: theme.colors.textSoft, ...theme.typography.medium, fontSize: 12 }}>
              {label as string}
            </Text>
            <TextInput
              onChangeText={setter as (value: string) => void}
              placeholder={label as string}
              placeholderTextColor={theme.colors.textSoft}
              value={value as string}
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                color: theme.colors.text,
                fontSize: 16,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            />
          </View>
        ))}

        <PillButton
          href={undefined}
          label={updateProfileMutation.isPending ? '保存中…' : '继续选择兴趣标签'}
          onPress={handleContinue}
          variant="accent"
        />
      </View>
    </PageShell>
  );
}
