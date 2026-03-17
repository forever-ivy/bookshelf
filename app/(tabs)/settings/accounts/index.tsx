import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useAccountsQuery } from '@/lib/api/react-query/hooks';
import { appRoutes, getSettingsAccountHref } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function AccountsScreen() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const canManage = currentAccount?.system_role === 'admin';
  const accountsQuery = useAccountsQuery();
  const accounts = accountsQuery.data ?? [];

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (!isAuthenticated) {
    return <Redirect href={appRoutes.authLogin} />;
  }

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={`查看 ${connection.displayName} 当前家庭下的后台账户绑定情况。`}
          title="账户审计"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="以下是当前书柜下所有登录账号的信息，仅供查看。"
          title="当前账户">
          {isPreviewMode ? (
            <StateCard
              description="预览模式下显示的为示例数据。"
              title="预览模式"
              variant="warning"
            />
          ) : null}
          {!canManage ? (
            <StateCard
              description="只有管理员可以查看账户审计信息。"
              title="你没有查看权限"
              variant="warning"
            />
          ) : null}
          {canManage && accountsQuery.isLoading ? (
            <StateCard title="账号加载中" description="正在加载账号信息，请稍候。" />
          ) : null}
          {canManage && accountsQuery.error ? (
            <StateCard
              description={accountsQuery.error.message}
              title="账户审计暂时不可用"
              variant="error"
            />
          ) : null}
          {canManage && !accountsQuery.isLoading && !accounts.length ? (
            <StateCard
              description="当前家庭还没有可审计的后台账户。"
              title="没有账户记录"
            />
          ) : null}
          {canManage
            ? accounts.map((account, index) => (
                <Animated.View
                  entering={createStaggeredFadeIn(index, 35)}
                  key={account.id}
                  layout={motionTransitions.gentle}
                  style={{
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.cardBorder,
                    borderCurve: 'continuous',
                    borderRadius: theme.radii.lg,
                    borderWidth: 1,
                    gap: 12,
                    padding: 16,
                  }}>
                  <View style={{ gap: 6 }}>
                    <Text
                      selectable
                      style={{
                        color: theme.colors.text,
                        ...theme.typography.semiBold,
                        fontSize: 17,
                      }}>
                      {account.username ?? `账户 #${account.id}`}
                    </Text>
                    <Text
                      selectable
                      style={{
                        color: theme.colors.textMuted,
                        ...theme.typography.body,
                        fontSize: 13,
                        lineHeight: 19,
                      }}>
                      {[
                        account.system_role ?? 'user',
                        account.status ?? 'active',
                        `${account.linked_user_count ?? 0} 个成员`,
                      ].join(' · ')}
                    </Text>
                  </View>
                  <PrimaryActionButton
                    label="查看详情"
                    onPress={() => router.push(getSettingsAccountHref(account.id))}
                    variant="ghost"
                  />
                </Animated.View>
              ))
            : null}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
