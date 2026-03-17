import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Redirect } from 'expo-router';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useUsersQuery, useUpdateUserMutation } from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function MembersScreen() {
  const { theme } = useBookleafTheme();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const currentMember = useSessionStore((state) => state.currentMember);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const usersQuery = useUsersQuery();
  const updateUserMutation = useUpdateUserMutation();
  const canManage = currentAccount?.system_role === 'admin';
  const members = usersQuery.data ?? [];

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
          description={
            canManage
              ? `当前连接到 ${connection.displayName}。你可以把家庭成员设置为家长或孩子。`
              : `当前连接到 ${connection.displayName}。只有管理员可以调整家庭角色。`
          }
          title="家庭角色"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="在这里调整家庭成员的角色。新成员需通过注册流程加入。"
          title="家庭成员">
          {isPreviewMode ? (
            <StateCard
              description="预览模式下不会保存任何修改。"
              title="预览模式"
              variant="warning"
            />
          ) : null}
          {!canManage ? (
            <StateCard
              description="你当前是普通用户，需要管理员账号才能调整成员角色。"
              title="当前为只读模式"
              variant="warning"
            />
          ) : null}
          {usersQuery.isLoading ? (
            <StateCard
              description="正在同步当前家庭成员。"
              title="成员加载中"
            />
          ) : null}
          {usersQuery.error ? (
            <StateCard
              description="家庭成员暂时没有同步出来，请稍后再试。"
              title="成员列表不可用"
              variant="error"
            />
          ) : null}
          {!usersQuery.isLoading && !members.length ? (
            <StateCard
              description="家庭还没有成员，请邀请成员注册后加入。"
              title="还没有成员"
            />
          ) : null}
          {members.map((member, index) => {
            const isCurrent = currentMember?.id === member.id;

            return (
              <Animated.View
                entering={createStaggeredFadeIn(index, 35)}
                key={member.id}
                layout={motionTransitions.gentle}
                style={{
                  backgroundColor: isCurrent
                    ? theme.colors.glassAccentSoft
                    : theme.colors.surfaceElevated,
                  borderColor: theme.colors.cardBorder,
                  borderCurve: 'continuous',
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  gap: 14,
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
                    {member.name}
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 13,
                      lineHeight: 18,
                    }}>
                    {[member.role, isCurrent ? '当前登录' : null, member.grade_level]
                      .filter(Boolean)
                      .join(' · ') || '家庭阅读成员'}
                  </Text>
                </View>
                {canManage ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    <View style={{ minWidth: '47%' }}>
                      <PrimaryActionButton
                        disabled={isPreviewMode || updateUserMutation.isPending}
                        label={member.role === 'parent' ? '当前是家长' : '设为家长'}
                        loading={updateUserMutation.isPending}
                        onPress={() =>
                          updateUserMutation.mutate({
                            memberId: member.id,
                            payload: { role: 'parent' },
                          })
                        }
                        variant={member.role === 'parent' ? 'ghost' : 'primary'}
                      />
                    </View>
                    <View style={{ minWidth: '47%' }}>
                      <PrimaryActionButton
                        disabled={isPreviewMode || updateUserMutation.isPending}
                        label={member.role === 'child' ? '当前是孩子' : '设为孩子'}
                        loading={updateUserMutation.isPending}
                        onPress={() =>
                          updateUserMutation.mutate({
                            memberId: member.id,
                            payload: { role: 'child' },
                          })
                        }
                        variant={member.role === 'child' ? 'ghost' : 'primary'}
                      />
                    </View>
                  </View>
                ) : null}
              </Animated.View>
            );
          })}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
