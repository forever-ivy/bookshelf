import { useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { AppIcon } from '@/components/app-icon';
import { GlassPillButton } from '@/components/glass-pill-button';
import { PrimaryActionButton } from '@/components/primary-action-button';
import { ScreenShell } from '@/components/screen-shell';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { createBookshelfApiClient } from '@/lib/api/client';
import { createConnectionProfile } from '@/lib/connection';
import { createStaggeredFadeIn } from '@/lib/motion';
import { useSessionStore } from '@/stores/session-store';

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '无法连接到这台书柜，请检查地址后重试。';
}

export default function ConnectScreen() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const enterPreviewMode = useSessionStore((state) => state.enterPreviewMode);
  const setConnection = useSessionStore((state) => state.setConnection);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [manualUrl, setManualUrl] = React.useState(connection?.baseUrl ?? '');
  const [showManualEntry, setShowManualEntry] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  async function connectCabinet(url: string) {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const profile = createConnectionProfile(url);
      await createBookshelfApiClient(profile.baseUrl).getCompartments();
      setConnection(profile);
      router.replace('/(app)/home');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell contentContainerStyle={{ gap: 28, paddingTop: 22 }}>
      <Animated.View entering={createStaggeredFadeIn(0)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <GlassPillButton
          icon="back"
          onPress={() => {
            if (connection?.baseUrl) {
              router.replace('/(app)/home');
            }
          }}
        />
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.72)',
            borderColor: bookleafTheme.colors.cardBorder,
            borderCurve: 'continuous',
            borderRadius: bookleafTheme.radii.pill,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.textMuted,
              fontFamily: bookleafTheme.fonts.semiBold,
              fontSize: 13,
            }}>
            第 1 步 / 共 3 步
          </Text>
        </View>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} style={{ flexDirection: 'row', gap: 8 }}>
        {[0, 1, 2].map((index) => (
          <View
            key={index}
            style={{
              backgroundColor:
                index === 0
                  ? bookleafTheme.colors.primaryStrong
                  : 'rgba(23,32,51,0.08)',
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.pill,
              flex: 1,
              height: 6,
            }}
          />
        ))}
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} style={{ gap: 12 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            fontFamily: bookleafTheme.fonts.heading,
            fontSize: 38,
            lineHeight: 44,
          }}>
          连接你的书柜
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            fontFamily: bookleafTheme.fonts.body,
            fontSize: 16,
            lineHeight: 24,
          }}>
          扫描书柜服务端展示的二维码，或者手动输入书柜地址。
        </Text>
      </Animated.View>
      <Animated.View
        entering={createStaggeredFadeIn(3)}
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.76)',
          borderColor: bookleafTheme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: 38,
          borderStyle: 'dashed',
          borderWidth: 1,
          gap: 16,
          paddingHorizontal: 24,
          paddingVertical: 34,
        }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: bookleafTheme.colors.surfaceMuted,
            borderCurve: 'continuous',
            borderRadius: 32,
            height: 120,
            justifyContent: 'center',
            width: 120,
          }}>
          <AppIcon color={bookleafTheme.colors.primaryStrong} name="qr" size={52} />
        </View>
        <View style={{ gap: 6 }}>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.text,
              fontFamily: bookleafTheme.fonts.semiBold,
              fontSize: 18,
              textAlign: 'center',
            }}>
            扫描书柜二维码
          </Text>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.textMuted,
              fontFamily: bookleafTheme.fonts.body,
              fontSize: 14,
              lineHeight: 20,
              textAlign: 'center',
            }}>
            二维码里应包含 Python 后端地址，例如 `http://192.168.1.20:5000`。
          </Text>
        </View>
      </Animated.View>
      <Animated.View
        entering={createStaggeredFadeIn(4)}
        style={{
          backgroundColor: 'rgba(240,244,239,0.92)',
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.lg,
          flexDirection: 'row',
          gap: 12,
          padding: 16,
        }}>
        <AppIcon color={bookleafTheme.colors.textMuted} name="info" size={18} />
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            flex: 1,
            fontFamily: bookleafTheme.fonts.body,
            fontSize: 13,
            lineHeight: 18,
          }}>
          Bookleaf 会先验证书柜是否可达，只有服务端连通后才会进入首页。
        </Text>
      </Animated.View>
      {showManualEntry ? (
        <Animated.View
          entering={createStaggeredFadeIn(5)}
          style={{
            backgroundColor: 'rgba(255,255,255,0.76)',
            borderColor: bookleafTheme.colors.cardBorder,
            borderCurve: 'continuous',
            borderRadius: bookleafTheme.radii.xl,
            borderWidth: 1,
            gap: 14,
            padding: 20,
          }}>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.text,
              fontFamily: bookleafTheme.fonts.semiBold,
              fontSize: 16,
            }}>
            书柜地址
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setManualUrl}
            placeholder="https://cabinet.example.com"
            placeholderTextColor={bookleafTheme.colors.textSoft}
            style={{
              backgroundColor: 'rgba(255,255,255,0.82)',
              borderColor: 'rgba(158,195,255,0.22)',
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.md,
              borderWidth: 1,
              color: bookleafTheme.colors.text,
              fontFamily: bookleafTheme.fonts.medium,
              fontSize: 15,
              minHeight: 56,
              paddingHorizontal: 16,
            }}
            value={manualUrl}
          />
          <PrimaryActionButton
            disabled={isSubmitting || !manualUrl.trim()}
            label="使用地址连接"
            loading={isSubmitting}
            onPress={() => connectCabinet(manualUrl)}
          />
        </Animated.View>
      ) : null}
      {errorMessage ? (
        <View
          style={{
            backgroundColor: '#FEE2E2',
            borderCurve: 'continuous',
            borderRadius: bookleafTheme.radii.lg,
            padding: 16,
          }}>
          <Text
            selectable
            style={{
              color: '#991B1B',
              fontFamily: bookleafTheme.fonts.medium,
              fontSize: 13,
              lineHeight: 18,
            }}>
            {errorMessage}
          </Text>
        </View>
      ) : null}
      {connection?.baseUrl ? (
        <Animated.View entering={createStaggeredFadeIn(6)}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(app)/home')}
          style={{
            backgroundColor: 'rgba(255,255,255,0.76)',
            borderColor: bookleafTheme.colors.cardBorder,
            borderCurve: 'continuous',
            borderRadius: bookleafTheme.radii.xl,
            borderWidth: 1,
            gap: 8,
            padding: 18,
          }}>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.text,
              fontFamily: bookleafTheme.fonts.semiBold,
              fontSize: 16,
            }}>
            继续使用 {connection.displayName}
          </Text>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.textMuted,
              fontFamily: bookleafTheme.fonts.body,
              fontSize: 13,
            }}>
            {connection.baseUrl}
          </Text>
        </Pressable>
        </Animated.View>
      ) : null}
      <Animated.View entering={createStaggeredFadeIn(7)} style={{ gap: 12 }}>
        <PrimaryActionButton label="扫码连接" onPress={() => router.push('/scanner')} />
        <PrimaryActionButton
          label={showManualEntry ? '收起手动输入' : '手动输入地址'}
          onPress={() => setShowManualEntry((value) => !value)}
          variant="ghost"
        />
        {__DEV__ ? (
          <PrimaryActionButton
            label="无书柜预览"
            onPress={() => {
              enterPreviewMode();
              router.replace('/(app)/home');
            }}
            variant="ghost"
          />
        ) : null}
      </Animated.View>
    </ScreenShell>
  );
}
