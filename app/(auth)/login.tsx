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
          description={`你已经绑定到 ${activeConnection.displayName}。输入在 App 注册过的用户名和密码即可进入书柜。`}
          title="登录书柜"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)}>
        <SectionCard
          description="登录成功后，Bookleaf 会把 JWT 保存在本机，下次回到应用会直接恢复到你的账号。"
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
                fontSize: 15,
                minHeight: 56,
                paddingHorizontal: 16,
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
          description={
            pendingPairing?.pairToken
              ? '你刚刚通过二维码完成了书柜绑定。如果这是首次使用，也可以直接创建新账号。'
              : '如果这是新书柜，请先扫描 Web 端二维码，拿到一次性配对凭证后才能注册。'
          }
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
                  ? '这是这台书柜的首次注册，创建成功后你会自动成为管理员。'
                  : '新注册账号会自动加入当前家庭，默认身份是普通用户和孩子。'}
              </Text>
            ) : null}
            {!pendingPairing?.pairToken ? (
              <Pressable onPress={() => router.push(appRoutes.scanner)}>
                <Text
                  selectable
                  style={{
                    color: theme.colors.primaryStrong,
                    ...theme.typography.semiBold,
                    fontSize: 14,
                  }}>
                  打开扫码页
                </Text>
              </Pressable>
            ) : null}
          </View>
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
