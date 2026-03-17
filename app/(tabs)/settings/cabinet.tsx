import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { createBookshelfApiClient } from '@/lib/api/client';
import { appRoutes } from '@/lib/app/routes';
import { performCabinetDisconnect } from '@/lib/app/session-actions';
import { useSessionStore } from '@/stores/session-store';

export default function CabinetSettingsRoute() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const clearAuthSession = useSessionStore((state) => state.clearAuthSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (!isAuthenticated) {
    return <Redirect href={appRoutes.authLogin} />;
  }

  return (
    <ScreenShell activeNavKey="settings" contentContainerStyle={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 40,
          }}>
          书柜连接
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 15,
            lineHeight: 22,
          }}>
          在这里查看当前书柜地址，重新扫码，或者断开当前设备连接。
        </Text>
      </View>
      <View
        style={{
          backgroundColor: theme.colors.overlaySurface,
          borderColor: theme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          gap: 10,
          padding: 22,
        }}>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.bold,
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}>
          当前书柜
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 30,
          }}>
          {connection.displayName}
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.medium,
            fontSize: 14,
            lineHeight: 22,
          }}>
          {connection.baseUrl}
        </Text>
      </View>
      <SectionCard
        description="退出账号、重新扫码或断开与书柜的连接。"
        title="连接操作">
        <PrimaryActionButton
          label="退出当前账号"
          onPress={async () => {
            try {
              await createBookshelfApiClient(connection.baseUrl).logout();
            } catch {}
            clearAuthSession();
            router.replace(appRoutes.authLogin);
          }}
          variant="ghost"
        />
        <PrimaryActionButton
          label="重新扫码连接"
          onPress={() => router.push(appRoutes.scanner)}
        />
        <PrimaryActionButton
          label="修改书柜地址"
          onPress={() => router.push(appRoutes.connect)}
          variant="ghost"
        />
        <PrimaryActionButton
          label="断开当前书柜"
          onPress={() => {
            performCabinetDisconnect({
              clearQueries: () => queryClient.clear(),
              clearSession,
            });
            router.replace(appRoutes.connect);
          }}
          variant="ghost"
        />
      </SectionCard>
      <StateCard
        description="如果是给另一台书柜重新配网，建议先断开当前连接，再重新扫码。"
        title="迁移提示"
        variant="warning"
      />
    </ScreenShell>
  );
}
