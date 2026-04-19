import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { AuthInput } from '@/components/auth/auth-input';
import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRegisterMutation } from '@/hooks/use-library-app-data';
import { appArtwork } from '@/lib/app/artwork';
import { getAuthActionErrorMessage } from '@/lib/api/client';

export default function RegisterRoute() {
  const { bootstrapStatus, onboarding, setSession, token } = useAppSession();
  const { theme } = useAppTheme();
  const router = useRouter();
  const registerMutation = useRegisterMutation();
  const [displayName, setDisplayName] = React.useState('');
  const [password, setPassword] = React.useState('');
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
    if (!username.trim() || !displayName.trim() || !password.trim()) {
      toast.error('请把账号、昵称和密码填写完整后再试。');
      return;
    }

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
      toast.error(
        getAuthActionErrorMessage(error, {
          action: 'register',
          fallback: '注册失败，请检查账号信息和后端服务状态。',
        })
      );
    }
  };

  return (
    <PageShell mode="workspace" pageTitle="创建账号">
      <View style={{ gap: theme.spacing.xl }}>
        <EditorialIllustration
          height={176}
          source={appArtwork.notionRegisterWelcome}
          testID="register-hero-illustration"
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
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 21,
            }}>
            先创建一个读者账号，后续再补全学院、专业、年级和兴趣标签。
          </Text>

          <AuthInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setUsername}
            placeholder="请输入用户名"
            testID="register-username-input"
            value={username}
          />

          <AuthInput
            autoCapitalize="words"
            onChangeText={setDisplayName}
            placeholder="请输入显示名称"
            testID="register-display-name-input"
            value={displayName}
          />

          <AuthInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setPassword}
            placeholder="请输入密码"
            secureTextEntry
            testID="register-password-input"
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
      </View>
    </PageShell>
  );
}
