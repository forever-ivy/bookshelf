import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
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

  return '登录失败，请检查用户名和密码。';
}

export default function LoginScreen() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : false
  );
  const pendingPairing = useSessionStore((state) => state.pendingPairing);
  const clearPendingPairing = useSessionStore((state) => state.clearPendingPairing);
  const setAuthSession = useSessionStore((state) => state.setAuthSession);
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (isAuthenticated) {
    return <Redirect href={appRoutes.home} />;
  }

  const activeConnection = connection;

  async function handleLogin() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const session = await createBookshelfApiClient(activeConnection.baseUrl).login({
        password,
        username,
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
          description={`已连接至 ${activeConnection.displayName}。请登录。`}
          showBackButton={false}
          title="登录书柜"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)}>
        <SectionCard
          description="下次免密自动登录。"
          title="账号登录">
          <View style={{ gap: 12 }}>
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
              placeholder="密码"
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
            <PrimaryActionButton
              disabled={isSubmitting || !username.trim() || !password.trim()}
              label="登录"
              loading={isSubmitting}
              onPress={handleLogin}
            />
          </View>
        </SectionCard>
      </Animated.View>
      {errorMessage ? (
        <Animated.View entering={createStaggeredFadeIn(2)}>
          <StateCard
            description={errorMessage}
            title="登录失败"
            variant="error"
          />
        </Animated.View>
      ) : null}
      <Animated.View entering={createStaggeredFadeIn(3)}>
        <SectionCard
          title="还没有账号？">
          <View style={{ gap: 12 }}>
            <PrimaryActionButton
              label={pendingPairing?.pairToken ? '创建新账号' : '先去扫码绑定'}
              onPress={() =>
                router.push(
                  pendingPairing?.pairToken ? appRoutes.authRegister : appRoutes.scanner
                )
              }
              variant="ghost"
            />
            {pendingPairing?.pairToken ? (
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                  lineHeight: 18,
                }}>
                {pendingPairing.requiresSetup
                  ? '首次注册即为管理员。'
                  : '注册后自动加入当前家庭。'}
              </Text>
            ) : null}
          </View>
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
