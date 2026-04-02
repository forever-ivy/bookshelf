import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { toast } from 'sonner-native';

import { PillButton } from '@/components/base/pill-button';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useUpdateProfileMutation } from '@/hooks/use-library-app-data';
import { getLibraryErrorMessage } from '@/lib/api/client';

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
    try {
      const nextSession = await updateProfileMutation.mutateAsync({
        college,
        displayName,
        gradeYear,
        major,
        readingProfileSummary:
          profile?.readingProfileSummary ?? '偏好先看章节框架，再进入细节和例题。',
      });

      router.replace(nextSession.onboarding.needsInterestSelection ? '/onboarding/interests' : '/');
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '资料保存失败，请确认登录状态和 readers 接口状态。'));
    }
  };

  return (
    <PageShell mode="workspace">
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 14,
          lineHeight: 21,
        }}>
        填写学院、专业和年级后，找书结果会更贴近你的课程与馆藏。
      </Text>
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
        }}>
        <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.medium, fontSize: 13 }}>
          第 1 步，共 2 步
        </Text>

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
              onChangeText={(value) => {
                (setter as (nextValue: string) => void)(value);
              }}
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
          label={updateProfileMutation.isPending ? '保存中…' : '保存并继续'}
          onPress={handleContinue}
          variant="accent"
        />
      </View>
    </PageShell>
  );
}
