import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import {
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { createBookshelfApiClient } from '@/lib/api/client';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '注册失败，请检查输入内容后重试。';
}

export default function RegisterScreen() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : false
  );
  const pendingPairing = useSessionStore((state) => state.pendingPairing);
  const clearPendingPairing = useSessionStore((state) => state.clearPendingPairing);
  const setAuthSession = useSessionStore((state) => state.setAuthSession);
  const [name, setName] = React.useState('');
  const [familyName, setFamilyName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (isAuthenticated) {
    return <Redirect href={appRoutes.home} />;
  }

  if (!pendingPairing?.pairToken) {
    return (
      <ScreenShell contentContainerStyle={{ gap: 20, paddingTop: 18 }}>
        <Animated.View entering={createStaggeredFadeIn(0)}>
          <FlowScreenHeader
            description="注册前需要先扫描 Web 端二维码，拿到一次性配对凭证。"
            title="先绑定书柜"
          />
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(1)}>
          <StateCard
            description="当前没有可用的配对凭证。请回到扫码页重新扫描二维码，然后再继续注册。"
            title="缺少配对信息"
            variant="warning"
          />
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(2)}>
          <PrimaryActionButton
            label="打开扫码页"
            onPress={() => router.replace(appRoutes.scanner)}
          />
        </Animated.View>
      </ScreenShell>
    );
  }

  const activeConnection = connection;
  const pairingContext = pendingPairing;

  async function handleRegister() {
    if (password !== confirmPassword) {
      setErrorMessage('两次输入的密码不一致。');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await createBookshelfApiClient(activeConnection.baseUrl).register({
        family_name: pairingContext.requiresSetup ? familyName.trim() : undefined,
        name: name.trim(),
        pair_token: pairingContext.pairToken,
        password,
        username: username.trim(),
      });
      setAuthSession({
        account: session.account,
        authToken: session.token,
        currentMember: session.user,
      });
      clearPendingPairing();
      router.replace(appRoutes.home);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell contentContainerStyle={{ gap: 20, paddingTop: 18 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={
            pairingContext.requiresSetup
              ? `你正在初始化 ${activeConnection.displayName}。首个注册账号会自动成为管理员和家长。`
              : `你已经绑定到 ${activeConnection.displayName}。注册成功后会自动加入当前家庭。`
          }
          title="创建账号"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)}>
        <SectionCard
          description="注册完成后，应用会自动保存当前登录态，并把你带回书柜首页。"
          title="填写资料">
          <View style={{ gap: 12 }}>
            <TextInput
              autoCapitalize="words"
              onChangeText={setName}
              placeholder="你的名字"
              placeholderTextColor={theme.colors.textSoft}
              style={{
                backgroundColor: theme.colors.inputSurface,
                borderColor: theme.colors.inputBorder,
                borderCurve: 'continuous',
                borderRadius: theme.radii.md,
                borderWidth: 1,
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 15,
                minHeight: 56,
                paddingHorizontal: 16,
              }}
              value={name}
            />
            {pairingContext.requiresSetup ? (
              <TextInput
                autoCapitalize="words"
                onChangeText={setFamilyName}
                placeholder="家庭名称"
                placeholderTextColor={theme.colors.textSoft}
                style={{
                  backgroundColor: theme.colors.inputSurface,
                  borderColor: theme.colors.inputBorder,
                  borderCurve: 'continuous',
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  color: theme.colors.text,
                  ...theme.typography.medium,
                  fontSize: 15,
                  minHeight: 56,
                  paddingHorizontal: 16,
                }}
                value={familyName}
              />
            ) : null}
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setUsername}
              placeholder="用户名"
              placeholderTextColor={theme.colors.textSoft}
              style={{
                backgroundColor: theme.colors.inputSurface,
                borderColor: theme.colors.inputBorder,
                borderCurve: 'continuous',
                borderRadius: theme.radii.md,
                borderWidth: 1,
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 15,
                minHeight: 56,
                paddingHorizontal: 16,
              }}
              value={username}
            />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setPassword}
              placeholder="密码（至少 6 位）"
              placeholderTextColor={theme.colors.textSoft}
              secureTextEntry
              style={{
                backgroundColor: theme.colors.inputSurface,
                borderColor: theme.colors.inputBorder,
                borderCurve: 'continuous',
                borderRadius: theme.radii.md,
                borderWidth: 1,
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 15,
                minHeight: 56,
                paddingHorizontal: 16,
              }}
              value={password}
            />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setConfirmPassword}
              placeholder="确认密码"
              placeholderTextColor={theme.colors.textSoft}
              secureTextEntry
              style={{
                backgroundColor: theme.colors.inputSurface,
                borderColor: theme.colors.inputBorder,
                borderCurve: 'continuous',
                borderRadius: theme.radii.md,
                borderWidth: 1,
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 15,
                minHeight: 56,
                paddingHorizontal: 16,
              }}
              value={confirmPassword}
            />
            <PrimaryActionButton
              disabled={
                isSubmitting ||
                !name.trim() ||
                !username.trim() ||
                !password.trim() ||
                !confirmPassword.trim() ||
                (pairingContext.requiresSetup && !familyName.trim())
              }
              label={pairingContext.requiresSetup ? '创建管理员账号' : '注册并加入家庭'}
              loading={isSubmitting}
              onPress={handleRegister}
            />
          </View>
        </SectionCard>
      </Animated.View>
      {errorMessage ? (
        <Animated.View entering={createStaggeredFadeIn(2)}>
          <StateCard
            description={errorMessage}
            title="注册失败"
            variant="error"
          />
        </Animated.View>
      ) : null}
      <Animated.View entering={createStaggeredFadeIn(3)}>
        <SectionCard
          description="如果你已经有账号，可以直接返回登录页。当前这份配对凭证会继续保留。"
          title="已有账号？">
          <PrimaryActionButton
            label="返回登录"
            onPress={() => router.replace(appRoutes.authLogin)}
            variant="ghost"
          />
          <View style={{ height: 10 }} />
          <Text
            selectable
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 13,
              lineHeight: 18,
            }}>
            当前配对码: {pairingContext.pairCode}
          </Text>
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
