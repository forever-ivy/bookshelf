import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useAccountQuery, useAccountUsersQuery } from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function AccountDetailScreen() {
  const { theme } = useBookleafTheme();
  const params = useLocalSearchParams<{ accountId?: string }>();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const canManage = currentAccount?.system_role === 'admin';
  const accountId = Number(params.accountId);
  const accountQuery = useAccountQuery(Number.isFinite(accountId) ? accountId : null);
  const accountUsersQuery = useAccountUsersQuery(Number.isFinite(accountId) ? accountId : null);
  const account = accountQuery.data;
  const relations = accountUsersQuery.data ?? [];

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
          description="查看账户的登录状态、系统角色，以及它当前关联到哪些家庭成员。"
          title="账户详情"
        />
      </Animated.View>
      {!canManage ? (
        <StateCard
          description="只有管理员可以查看账户详情。"
          title="你没有查看权限"
          variant="warning"
        />
      ) : null}
      {canManage ? (
        <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
          <SectionCard
            description="这里只展示后端当前已经同步的账户信息。"
            title="账户资料">
            {accountQuery.isLoading ? (
              <StateCard title="账户详情加载中" description="正在同步账户资料。" />
            ) : null}
            {accountQuery.error ? (
              <StateCard
                description={accountQuery.error.message}
                title="账户详情不可用"
                variant="error"
              />
            ) : null}
            {account ? (
              <View style={{ gap: 8 }}>
                <Text
                  selectable
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 20,
                  }}>
                  {account.username ?? `账户 #${account.id}`}
                </Text>
                <Text
                  selectable
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 14,
                    lineHeight: 21,
                  }}>
                  {[
                    account.system_role ?? 'user',
                    account.status ?? 'active',
                    account.phone ?? '未绑定手机号',
                  ].join(' · ')}
                </Text>
              </View>
            ) : null}
          </SectionCard>
        </Animated.View>
      ) : null}
      {canManage ? (
        <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
          <SectionCard
            description="这些成员是后端当前绑定到这个账户上的家庭成员。"
            title="关联成员">
            {accountUsersQuery.isLoading ? (
              <StateCard title="成员关联加载中" description="正在同步账户和成员的绑定关系。" />
            ) : null}
            {accountUsersQuery.error ? (
              <StateCard
                description={accountUsersQuery.error.message}
                title="成员关联不可用"
                variant="error"
              />
            ) : null}
            {!accountUsersQuery.isLoading && !relations.length ? (
              <StateCard title="还没有关联成员" description="这个账户当前没有绑定家庭成员。" />
            ) : null}
            {relations.map((relation, index) => (
              <Animated.View
                entering={createStaggeredFadeIn(index, 35)}
                key={`${relation.account_id}-${relation.user_id}`}
                layout={motionTransitions.gentle}
                style={{
                  backgroundColor: theme.colors.surfaceMuted,
                  borderCurve: 'continuous',
                  borderRadius: theme.radii.lg,
                  gap: 4,
                  padding: 14,
                }}>
                <Text
                  selectable
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 15,
                  }}>
                  {relation.name ?? `成员 #${relation.user_id}`}
                </Text>
                <Text
                  selectable
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 12,
                  }}>
                  {[relation.role ?? 'reader', relation.relation_type].join(' · ')}
                </Text>
              </Animated.View>
            ))}
          </SectionCard>
        </Animated.View>
      ) : null}
    </ScreenShell>
  );
}
