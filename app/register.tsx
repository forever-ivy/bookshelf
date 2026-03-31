import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { StateMessageCard } from '@/components/base/state-message-card';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRegisterMutation } from '@/hooks/use-library-app-data';
import { getLibraryErrorMessage } from '@/lib/api/client';

export default function RegisterRoute() {
  const { bootstrapStatus, onboarding, setSession, token } = useAppSession();
  const { theme } = useAppTheme();
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const [displayName, setDisplayName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState('');

  if (bootstrapStatus !== 'ready') {
    return null;
  }

  if (token) {
    const target = onboarding?.needsProfileBinding
      ? '/onboarding/profile'
      : onboarding?.needsInterestSelection
        ? '/onboarding/interests'
        : '/';
    return <Redirect href={target} />;
  }

  const handleSubmit = async () => {
    setSubmitError(null);

    try {
      const session = await registerMutation.mutateAsync({
        displayName,
        password,
        username,
      });

      await setSession({
        identity: session.identity,
        onboarding: session.onboarding,
        profile: session.profile,
        refreshToken: session.refreshToken ?? null,
        token: session.accessToken,
      });

      router.replace(
        session.onboarding.needsProfileBinding
          ? '/onboarding/profile'
          : session.onboarding.needsInterestSelection
            ? '/onboarding/interests'
            : '/'
      );
    } catch (error) {
      setSubmitError(getLibraryErrorMessage(error, '注册失败，请检查账号信息和后端服务状态。'));
    }
  };

  return (
    <PageShell headerTitle="创建账号" mode="workspace">
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.lg,
          padding: theme.spacing.xl,
          }}>
        {submitError ? (
          <StateMessageCard description={submitError} title="注册没有完成" tone="danger" />
        ) : null}

        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 21,
          }}>
          先创建一个读者账号，后续再补全学院、专业、年级和兴趣标签。
        </Text>

        <TextInput
          autoCapitalize="none"
          onChangeText={(value) => {
            setSubmitError(null);
            setUsername(value);
          }}
          placeholder="请输入用户名"
          placeholderTextColor="rgba(31, 30, 27, 0.42)"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.48)',
            borderColor: 'rgba(31, 30, 27, 0.10)',
            borderRadius: 28,
            borderWidth: 1,
            color: theme.colors.text,
            fontSize: 16,
            minHeight: 58,
            paddingHorizontal: 22,
          }}
          value={username}
        />

        <TextInput
          autoCapitalize="words"
          onChangeText={(value) => {
            setSubmitError(null);
            setDisplayName(value);
          }}
          placeholder="请输入显示名称"
          placeholderTextColor="rgba(31, 30, 27, 0.42)"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.48)',
            borderColor: 'rgba(31, 30, 27, 0.10)',
            borderRadius: 28,
            borderWidth: 1,
            color: theme.colors.text,
            fontSize: 16,
            minHeight: 58,
            paddingHorizontal: 22,
          }}
          value={displayName}
        />

        <TextInput
          autoCapitalize="none"
          onChangeText={(value) => {
            setSubmitError(null);
            setPassword(value);
          }}
          placeholder="请输入密码"
          placeholderTextColor="rgba(31, 30, 27, 0.42)"
          secureTextEntry
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.48)',
            borderColor: 'rgba(31, 30, 27, 0.10)',
            borderRadius: 28,
            borderWidth: 1,
            color: theme.colors.text,
            fontSize: 16,
            minHeight: 58,
            paddingHorizontal: 22,
          }}
          value={password}
        />

        <Pressable
          accessibilityRole="button"
          onPress={handleSubmit}
          style={({ pressed }) => ({
            borderRadius: 28,
            opacity: pressed ? 0.94 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          })}>
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#171614',
              borderRadius: 28,
              justifyContent: 'center',
              minHeight: 58,
            }}>
            <Text
              style={{
                color: '#FFFFFF',
                ...theme.typography.semiBold,
                fontSize: 16,
              }}>
              {registerMutation.isPending ? '注册中…' : '注册并开始'}
            </Text>
          </View>
        </Pressable>
      </View>
    </PageShell>
  );
}
