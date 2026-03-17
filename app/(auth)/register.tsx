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
            description="注册前需要先扫描书柜二维码完成配对。"
            title="先完成配对"
          />
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(1)}>
          <StateCard
            description="未检测到配对信息，请重新扫描书柜二维码后再继续。"
            title="配对信息已失效"
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
              ? `设置 ${activeConnection.displayName} 的管理员账号。`
              : `注册加入 ${activeConnection.displayName}。`
          }
          title="创建账号"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)}>
        <SectionCard
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
                fontSize: 16,
                minHeight: 60,
                paddingHorizontal: 18,
                textAlign: "left",
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
                  fontSize: 16,
                  minHeight: 60,
                  paddingHorizontal: 18,
                textAlign: "left",
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
                fontSize: 16,
                minHeight: 60,
                paddingHorizontal: 18,
                textAlign: "left",
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
                fontSize: 16,
                minHeight: 60,
                paddingHorizontal: 18,
                textAlign: "left",
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
                fontSize: 16,
                minHeight: 60,
                paddingHorizontal: 18,
                textAlign: "left",
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
          description="已经有账号？直接返回登录页即可，配对信息不会丢失。"
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
            已完成书柜配对
          </Text>
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
