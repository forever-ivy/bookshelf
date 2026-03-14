import { useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { SectionCard } from '@/components/surfaces/section-card';
import { ShortcutCard } from '@/components/actions/shortcut-card';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { performCabinetDisconnect } from '@/lib/app/session-actions';
import { useSessionStore } from '@/stores/session-store';

export default function SettingsRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const connection = useSessionStore((state) => state.connection);
  const clearSession = useSessionStore((state) => state.clearSession);

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  return (
    <ScreenShell activeNavKey="settings">
      <View style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.heading,
            fontSize: 40,
          }}>
          书柜设置
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            ...bookleafTheme.typography.body,
            fontSize: 15,
            lineHeight: 22,
          }}>
          管理当前书柜连接，切换到新书柜时也可以在这里重新配置。
        </Text>
      </View>
      <View
        style={{
          backgroundColor: 'rgba(255,255,255,0.76)',
          borderColor: bookleafTheme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.xl,
          borderWidth: 1,
          gap: 10,
          padding: 22,
        }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            ...bookleafTheme.typography.bold,
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}>
          当前书柜
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.heading,
            fontSize: 30,
          }}>
          {connection.displayName}
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            ...bookleafTheme.typography.medium,
            fontSize: 14,
            lineHeight: 22,
          }}>
          {connection.baseUrl}
        </Text>
      </View>
      <SectionCard
        description="除了管理连接，也可以从这里进入新的家庭前台操作流。"
        title="更多入口">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <ShortcutCard
            description="新增、编辑或删除家庭成员。"
            icon="users"
            onPress={() => router.push('/members')}
            title="家庭成员"
          />
          <ShortcutCard
            description="查看当前书柜的每一个格口状态。"
            icon="cabinet"
            onPress={() => router.push('/shelf')}
            title="家庭书架"
          />
        </View>
      </SectionCard>
      <PrimaryActionButton label="重新扫码连接" onPress={() => router.push('/scanner')} />
      <PrimaryActionButton label="修改书柜地址" onPress={() => router.push('/connect')} variant="ghost" />
      <PrimaryActionButton
        label="断开当前书柜"
        onPress={() => {
          performCabinetDisconnect({
            clearQueries: () => queryClient.clear(),
            clearSession,
          });
          router.replace('/connect');
        }}
        variant="ghost"
      />
    </ScreenShell>
  );
}
