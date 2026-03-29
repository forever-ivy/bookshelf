import { Redirect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useLoginMutation } from '@/hooks/use-library-app-data';

const loginHeroArtwork = require('../assets/illustrations/notion-style/login-cutout.png');

export default function LoginRoute() {
  const { bootstrapStatus, onboarding, setSession, token } = useAppSession();
  const { theme } = useAppTheme();
  const router = useRouter();
  const loginMutation = useLoginMutation();
  const [password, setPassword] = React.useState('');
  const [username, setUsername] = React.useState('');

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
    const session = await loginMutation.mutateAsync({
      password,
      username,
    });

    await setSession({
      identity: session.identity,
      onboarding: session.onboarding,
      profile: session.profile,
      token: session.accessToken,
    });

    router.replace(
      session.onboarding.needsProfileBinding
        ? '/onboarding/profile'
        : session.onboarding.needsInterestSelection
          ? '/onboarding/interests'
          : '/'
    );
  };

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
          minHeight: 820,
          paddingHorizontal: theme.spacing.xl,
          paddingTop: 12,
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
              marginTop: 12,
              minHeight: 360,
              width: '100%',
            }}
            testID="login-hero-stage">
            <View
              style={{
                backgroundColor: 'rgba(237, 231, 222, 0.88)',
                borderRadius: 120,
                height: 170,
                left: 0,
                position: 'absolute',
                top: 22,
                transform: [{ rotate: '-14deg' }],
                width: 170,
              }}
            />
            <View
              style={{
                backgroundColor: 'rgba(78, 99, 121, 0.10)',
                borderRadius: 132,
                height: 224,
                position: 'absolute',
                right: -10,
                top: 42,
                width: 224,
              }}
            />
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.34)',
                borderColor: 'rgba(78, 99, 121, 0.10)',
                borderRadius: 999,
                borderWidth: 1,
                bottom: 40,
                height: 210,
                left: 10,
                position: 'absolute',
                right: 10,
                transform: [{ rotate: '-9deg' }],
              }}
            />
            <View
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                borderRadius: 999,
                bottom: 28,
                height: 178,
                left: 34,
                position: 'absolute',
                right: 34,
                transform: [{ rotate: '7deg' }],
              }}
            />
            <Image
              contentFit="contain"
              source={loginHeroArtwork}
              style={{
                height: 330,
                width: 330,
              }}
              testID="login-hero-illustration"
            />
          </View>

          <View
            style={{
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginTop: 2,
            }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 48,
                letterSpacing: -2.2,
                lineHeight: 54,
              }}>
              知序
            </Text>
            <Text
              style={{
                color: 'rgba(31, 30, 27, 0.72)',
                ...theme.typography.medium,
                fontSize: 22,
                letterSpacing: -0.8,
                lineHeight: 28,
                textAlign: 'center',
              }}>
              整理你的知识
            </Text>
          </View>

          <View
            style={{
              gap: theme.spacing.lg,
              marginTop: 34,
              paddingBottom: theme.spacing.xl,
              width: '100%',
            }}>
            <TextInput
              autoCapitalize="none"
              placeholder="请输入用户名"
              placeholderTextColor="rgba(31, 30, 27, 0.42)"
              onChangeText={setUsername}
              value={username}
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
            />

            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              placeholder="请输入密码"
              placeholderTextColor="rgba(31, 30, 27, 0.42)"
              secureTextEntry
              value={password}
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

            <Text
              style={{
                color: 'rgba(31, 30, 27, 0.54)',
                ...theme.typography.body,
                fontSize: 12,
                lineHeight: 18,
                paddingHorizontal: theme.spacing.sm,
                textAlign: 'center',
              }}>
              首次进入将自动完成身份绑定与兴趣配置
            </Text>
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
          backgroundColor: 'rgba(237, 231, 222, 0.92)',
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
          backgroundColor: 'rgba(78, 99, 121, 0.08)',
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
          backgroundColor: 'rgba(231, 236, 231, 0.62)',
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
          backgroundColor: 'rgba(255, 255, 255, 0.34)',
          borderColor: 'rgba(78, 99, 121, 0.06)',
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
          backgroundColor: 'rgba(255, 255, 255, 0.18)',
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
          backgroundColor: '#F1C232',
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
