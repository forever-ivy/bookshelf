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
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const canManage = currentAccount?.system_role === 'admin';

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
      </View>
      <SectionCard

        title="设置入口">
        <TwoColumnGrid>
          <ShortcutCard

            icon="settings"
            onPress={() => router.push(appRoutes.settingsCabinet)}
            title="书柜连接"
          />
          {canManage ? (
            <ShortcutCard

              icon="users"
              onPress={() => router.push(appRoutes.settingsAccounts)}
              title="账户审计"
            />
          ) : null}
          <ShortcutCard

            icon="users"
            onPress={() => router.push(appRoutes.settingsMembers)}
            title="家庭成员"
          />
          {canManage ? (
            <ShortcutCard

              icon="bookmark"
              onPress={() => router.push(appRoutes.settingsFamily)}
              title="家庭设置"
            />
          ) : null}
        </TwoColumnGrid>
      </SectionCard>
    </ScreenShell>
  );
}
