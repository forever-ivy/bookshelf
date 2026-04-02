import { Redirect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React from 'react';
import { Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { toast } from 'sonner-native';

import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useLoginMutation } from '@/hooks/use-library-app-data';
import {
  getAuthActionErrorMessage,
  getLoginValidationErrorMessage,
} from '@/lib/api/client';

const loginHeroArtwork = require('../assets/illustrations/notion-style/login-cutout.png');

export default function LoginRoute() {
  const { bootstrapStatus, onboarding, setSession, token } = useAppSession();
  const { theme } = useAppTheme();
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  const [scrollViewResetKey, setScrollViewResetKey] = React.useState(0);
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');
  const hasOpenedKeyboardRef = React.useRef(false);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      hasOpenedKeyboardRef.current = true;
      setIsKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      if (hasOpenedKeyboardRef.current) {
        hasOpenedKeyboardRef.current = false;
        setScrollViewResetKey((currentValue) => currentValue + 1);
      }
      setIsKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const heroStageHeight = isKeyboardVisible ? 224 : 360;
  const heroIllustrationSize = isKeyboardVisible ? 196 : 330;
  const heroDecorationOpacity = isKeyboardVisible ? 0.3 : 1;
  const titleGap = isKeyboardVisible ? theme.spacing.sm : theme.spacing.sm;
  const titleFontSize = isKeyboardVisible ? 38 : 48;
  const titleLineHeight = isKeyboardVisible ? 44 : 54;
  const subtitleFontSize = isKeyboardVisible ? 18 : 22;
  const subtitleLineHeight = isKeyboardVisible ? 24 : 28;
  const formMarginTop = isKeyboardVisible ? 24 : 34;
  const formPaddingBottom = isKeyboardVisible ? theme.spacing.md : theme.spacing.xl;

  if (bootstrapStatus !== 'ready') {
    return (
      <PageShell
        backgroundDecoration={<LoginBackgroundDecoration />}
        insetBottom={72}
        mode="workspace"
        padded={false}
        scrollEnabled={false}>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 420,
            paddingHorizontal: theme.spacing.xl,
            paddingTop: theme.spacing.xxxl,
          }}>
          <Text style={{ color: theme.colors.text, ...theme.typography.medium, fontSize: 16 }}>
            正在加载登录状态…
          </Text>
        </View>
      </PageShell>
    );
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
    const validationError = getLoginValidationErrorMessage({
      password,
      username,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      const session = await loginMutation.mutateAsync({
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
          action: 'login',
          fallback: '登录失败，请检查用户名、密码和后端服务状态。',
        })
      );
    }
  };

  return (
    <PageShell
      backgroundDecoration={<LoginBackgroundDecoration />}
      insetBottom={isKeyboardVisible ? 24 : 72}
      keyboardAware
      mode="workspace"
      padded={false}
      scrollViewResetKey={scrollViewResetKey}
      scrollEnabled={isKeyboardVisible}>
      <View
        style={{
          alignItems: 'center',
          minHeight: isKeyboardVisible ? 680 : 820,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: isKeyboardVisible ? theme.spacing.md : 12,
        }}>
        <View
          style={{
            alignItems: 'center',
            maxWidth: 420,
            width: '100%',
          }}>
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: isKeyboardVisible ? theme.spacing.xs : 12,
              minHeight: heroStageHeight,
              width: '100%',
            }}
            testID="login-hero-stage">
            <View
              style={{
                backgroundColor: theme.colors.authDecorationSoft,
                borderRadius: 120,
                height: 170,
                left: 0,
                opacity: heroDecorationOpacity,
                position: 'absolute',
                top: 22,
                transform: [{ rotate: '-14deg' }],
                width: 170,
              }}
            />
            <View
              style={{
                backgroundColor: theme.colors.authDecorationAccent,
                borderRadius: 132,
                height: 224,
                opacity: heroDecorationOpacity,
                position: 'absolute',
                right: -10,
                top: 42,
                width: 224,
              }}
            />
            <View
              style={{
                backgroundColor: theme.colors.authDecorationGlass,
                borderColor: theme.colors.authDecorationGlassBorder,
                borderRadius: 999,
                borderWidth: 1,
                bottom: 40,
                height: 210,
                left: 10,
                opacity: heroDecorationOpacity,
                position: 'absolute',
                right: 10,
                transform: [{ rotate: '-9deg' }],
              }}
            />
            <View
              style={{
                backgroundColor: theme.colors.glassTint,
                borderRadius: 999,
                bottom: 28,
                height: 178,
                left: 34,
                opacity: heroDecorationOpacity,
                position: 'absolute',
                right: 34,
                transform: [{ rotate: '7deg' }],
              }}
            />
            <Image
              contentFit="contain"
              source={loginHeroArtwork}
              style={{
                height: heroIllustrationSize,
                width: heroIllustrationSize,
              }}
              testID="login-hero-illustration"
            />
          </View>

          <View
            style={{
              alignItems: 'center',
              gap: titleGap,
              marginTop: isKeyboardVisible ? theme.spacing.xs : 2,
            }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: titleFontSize,
                letterSpacing: -2.2,
                lineHeight: titleLineHeight,
              }}>
              知序
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.medium,
                fontSize: subtitleFontSize,
                letterSpacing: -0.8,
                lineHeight: subtitleLineHeight,
                textAlign: 'center',
              }}>
              整理你的知识
            </Text>
          </View>

          <View
            style={{
              gap: theme.spacing.lg,
              marginTop: formMarginTop,
              paddingBottom: formPaddingBottom,
              width: '100%',
            }}>
            <TextInput
              autoCapitalize="none"
              placeholder="请输入用户名"
              placeholderTextColor={theme.colors.inputPlaceholder}
              onChangeText={setUsername}
              value={username}
              style={{
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.inputBorder,
                borderRadius: 28,
                borderWidth: 1,
                color: theme.colors.text,
                fontSize: 16,
                minHeight: 58,
                paddingHorizontal: 22,
              }}
            />

            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="请输入密码"
              placeholderTextColor={theme.colors.inputPlaceholder}
              secureTextEntry
              value={password}
              style={{
                backgroundColor: theme.colors.inputBackground,
                borderColor: theme.colors.inputBorder,
                borderRadius: 28,
                borderWidth: 1,
                color: theme.colors.text,
                fontSize: 16,
                minHeight: 58,
                paddingHorizontal: 22,
              }}
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
                testID="login-submit-surface"
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.inverseSurface,
                  borderRadius: 28,
                  justifyContent: 'center',
                  minHeight: 58,
                }}>
                <Text
                  style={{
                    color: theme.colors.inverseText,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                }}>
                  {loginMutation.isPending ? '登录中…' : '继续登录'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/register')}
              style={({ pressed }) => ({
                alignItems: 'center',
                opacity: pressed ? 0.72 : 1,
                paddingVertical: 4,
              })}>
              <Text
                style={{
                  color: theme.colors.primaryStrong,
                  ...theme.typography.semiBold,
                  fontSize: 14,
                }}>
                创建新账号
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </PageShell>
  );
}

function LoginBackgroundDecoration() {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
      }}
      testID="login-background-decoration">
      <View
        style={{
          backgroundColor: theme.colors.authDecorationSoft,
          borderRadius: 180,
          height: 280,
          left: -90,
          position: 'absolute',
          top: -30,
          width: 280,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.authDecorationAccent,
          borderRadius: 220,
          height: 360,
          position: 'absolute',
          right: -150,
          top: 120,
          width: 360,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.authDecorationSupport,
          borderRadius: 220,
          height: 240,
          left: -70,
          position: 'absolute',
          top: 320,
          transform: [{ rotate: '16deg' }],
          width: 300,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.authDecorationGlass,
          borderColor: theme.colors.authDecorationGlassBorder,
          borderRadius: 999,
          borderWidth: 1,
          height: 320,
          left: -40,
          position: 'absolute',
          right: -40,
          top: 52,
          transform: [{ rotate: '-8deg' }],
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.glassTint,
          borderRadius: 999,
          bottom: 150,
          height: 180,
          left: 40,
          position: 'absolute',
          right: 40,
          transform: [{ rotate: '11deg' }],
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.accentLavender,
          borderRadius: 18,
          height: 12,
          left: 44,
          opacity: 0.8,
          position: 'absolute',
          top: 136,
          transform: [{ rotate: '-24deg' }],
          width: 12,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.authAccent,
          borderRadius: 999,
          height: 18,
          opacity: 0.86,
          position: 'absolute',
          right: 72,
          top: 168,
          width: 18,
        }}
      />
    </View>
  );
}
