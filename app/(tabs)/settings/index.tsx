import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { HeroBubbleBackground } from '@/components/background/hero-bubble-background';
import { SectionCard } from '@/components/surfaces/section-card';
import { ShortcutCard } from '@/components/actions/shortcut-card';
import { TwoColumnGrid } from '@/components/layout/two-column-grid';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { appRoutes } from '@/lib/app/routes';
import { useSessionStore } from '@/stores/session-store';

export default function SettingsRoute() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (!isAuthenticated) {
    return <Redirect href={appRoutes.authLogin} />;
  }

  return (
    <ScreenShell
      activeNavKey="settings"
      backgroundDecoration={<HeroBubbleBackground variant="settings" />}
      showTopOverlay={false}>
      <View style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 40,
          }}>
          书柜设置
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 15,
            lineHeight: 22,
          }}>
          连接维护和家庭成员管理都收在这里，和图书操作分开以后，设置页更像系统后台。
        </Text>
      </View>
      <SectionCard
        description="和系统配置相关的动作，都先收束到这里，再分发到对应的子页。"
        title="设置入口">
        <TwoColumnGrid>
          <ShortcutCard
            description="查看书柜地址、重新扫码，或断开当前连接。"
            icon="settings"
            onPress={() => router.push(appRoutes.settingsCabinet)}
            title="书柜连接"
          />
          <ShortcutCard
            description="新增、编辑或删除家庭成员。"
            icon="users"
            onPress={() => router.push(appRoutes.settingsMembers)}
            title="家庭成员"
          />
        </TwoColumnGrid>
      </SectionCard>
    </ScreenShell>
  );
}
