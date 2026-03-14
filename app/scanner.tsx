import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassPillButton } from '@/components/actions/glass-pill-button';
import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { createBookshelfApiClient } from '@/lib/api/client';
import { createConnectionProfile } from '@/lib/app/connection';
import { createStaggeredFadeIn } from '@/lib/presentation/motion';
import { shouldSkipScannedCode } from '@/lib/presentation/scanner-helpers';
import { useSessionStore } from '@/stores/session-store';

function getScannerError(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '这个二维码没有指向可连接的书柜服务。';
}

export default function ScannerScreen() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const setConnection = useSessionStore((state) => state.setConnection);
  const scanBlockRef = React.useRef<{
    blockedUntil: number;
    lastBlockedValue: string | null;
  }>({
    blockedUntil: 0,
    lastBlockedValue: null,
  });

  async function handleScan(data: string) {
    if (
      shouldSkipScannedCode(
        {
          blockedUntil: scanBlockRef.current.blockedUntil,
          isConnecting,
          lastBlockedValue: scanBlockRef.current.lastBlockedValue,
        },
        data
      )
    ) {
      return;
    }

    setIsConnecting(true);
    setFeedback('正在验证书柜...');

    try {
      const profile = createConnectionProfile(data);
      await createBookshelfApiClient(profile.baseUrl).getCompartments();
      setConnection(profile);
      router.replace('/home');
    } catch (error) {
      scanBlockRef.current = {
        blockedUntil: Date.now() + 2500,
        lastBlockedValue: data,
      };
      setFeedback(getScannerError(error));
      setIsConnecting(false);
    }
  }

  if (!permission) {
    return (
      <View
        style={{
          alignItems: 'center',
          backgroundColor: theme.colors.scannerBase,
          flex: 1,
          justifyContent: 'center',
        }}>
        <ActivityIndicator color={theme.colors.scannerText} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={{
          backgroundColor: theme.colors.scannerBase,
          flex: 1,
          justifyContent: 'space-between',
          paddingBottom: 44,
          paddingHorizontal: 24,
          paddingTop: 24,
        }}>
        <GlassPillButton icon="back" onPress={() => router.back()} />
        <Animated.View entering={createStaggeredFadeIn(0)} style={{ gap: 16 }}>
          <Text
            selectable
            style={{
              color: theme.colors.scannerText,
              ...theme.typography.heading,
              fontSize: 36,
            }}>
            需要相机权限
          </Text>
          <Text
            selectable
            style={{
              color: theme.colors.scannerTextSoft,
              ...theme.typography.body,
              fontSize: 16,
              lineHeight: 24,
          }}>
            Bookleaf 仅会使用相机扫描书柜二维码，并保存书柜地址。
          </Text>
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(1)}>
          <PrimaryActionButton label="开启相机" onPress={() => requestPermission()} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: theme.colors.scannerBase, flex: 1 }}>
      <CameraView
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => handleScan(data)}
        style={{ flex: 1 }}
      />
      <View
        pointerEvents="box-none"
        style={{
          bottom: 0,
          left: 0,
          padding: 24,
          position: 'absolute',
          right: 0,
          top: 0,
        }}>
        <Animated.View
          entering={createStaggeredFadeIn(0)}
          style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <GlassPillButton icon="back" onPress={() => router.back()} />
          <View
            style={{
              backgroundColor: theme.colors.scannerPanelSubtle,
              borderColor: theme.colors.scannerPanelBorderStrong,
              borderCurve: 'continuous',
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}>
            <Text
              selectable
              style={{
                color: theme.colors.scannerText,
                ...theme.typography.semiBold,
                fontSize: 13,
              }}>
              扫描书柜二维码
            </Text>
          </View>
        </Animated.View>
        <View
          style={{
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
          }}>
          <View
            style={{
              borderColor: theme.colors.scannerFrame,
              borderCurve: 'continuous',
              borderRadius: 36,
              borderWidth: 3,
              height: 268,
              width: 268,
            }}
          />
        </View>
        <Animated.View
          entering={createStaggeredFadeIn(1)}
          style={{
            backgroundColor: theme.colors.scannerPanel,
            borderColor: theme.colors.scannerPanelBorder,
            borderCurve: 'continuous',
            borderRadius: 30,
            borderWidth: 1,
            gap: 8,
            padding: 18,
          }}>
          <Text
            selectable
            style={{
              color: theme.colors.scannerText,
              ...theme.typography.semiBold,
              fontSize: 16,
            }}>
            将二维码放入框内
          </Text>
          <Text
            selectable
            style={{
              color: theme.colors.scannerTextMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 20,
            }}>
            验证通过后，系统会自动带你进入应用。
          </Text>
          {feedback ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                scanBlockRef.current = {
                  blockedUntil: 0,
                  lastBlockedValue: null,
                };
                setFeedback(null);
                setIsConnecting(false);
              }}
              style={{
                backgroundColor: theme.colors.scannerRetry,
                borderCurve: 'continuous',
                borderRadius: theme.radii.lg,
                padding: 12,
              }}>
              <Text
                selectable
                style={{
                  color: theme.colors.scannerText,
                  ...theme.typography.medium,
                  fontSize: 13,
                }}>
                {feedback}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}
