import React from 'react';
import { Alert, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Redirect, useRouter } from 'expo-router';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { useActiveMember } from '@/hooks/use-active-member';
import { useDeleteUserMutation, useSwitchUserMutation } from '@/lib/api/react-query/hooks';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function MembersScreen() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const { activeMember, currentMemberId, members, usersQuery } = useActiveMember();
  const deleteUserMutation = useDeleteUserMutation();
  const switchUserMutation = useSwitchUserMutation();

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={`当前连接到 ${connection.displayName}。你可以维护家庭成员，并切换正在使用的读者。`}
          title="家庭成员"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description={`当前活跃成员是 ${activeMember?.name ?? '未选择'}。新增或编辑成员都会回流到现有首页、书库和报告数据里。`}
          title="成员列表">
          {isPreviewMode ? (
            <StateCard
              description="预览模式下你仍然可以浏览成员结构，但创建、编辑和删除都会被禁用。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          <PrimaryActionButton
            disabled={isPreviewMode}
            label="新增成员"
            onPress={() => router.push('/member-form')}
          />
          {usersQuery.isLoading ? (
            <StateCard
              description="正在同步家庭成员。"
              title="成员加载中"
            />
          ) : null}
          {usersQuery.error ? (
            <StateCard
              description="家庭成员暂时没有同步出来，请稍后重试。"
              title="成员列表不可用"
              variant="error"
            />
          ) : null}
          {!usersQuery.isLoading && !members.length ? (
            <StateCard
              description="目前还没有家庭成员。先创建一个孩子或家长档案，首页就会开始完整运转。"
              title="还没有成员"
            />
          ) : null}
          {members.map((member, index) => {
            const isActive = currentMemberId === member.id;

            return (
              <Animated.View
                entering={createStaggeredFadeIn(index, 35)}
                key={member.id}
                layout={motionTransitions.gentle}
                style={{
                  backgroundColor: isActive
                    ? 'rgba(158,195,255,0.22)'
                    : 'rgba(255,255,255,0.82)',
                  borderColor: bookleafTheme.colors.cardBorder,
                  borderCurve: 'continuous',
                  borderRadius: bookleafTheme.radii.lg,
                  borderWidth: 1,
                  gap: 14,
                  padding: 16,
                }}>
                <View style={{ gap: 6 }}>
                  <Text
                    selectable
                    style={{
                      color: bookleafTheme.colors.text,
                      ...bookleafTheme.typography.semiBold,
                      fontSize: 17,
                    }}>
                    {member.name}
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: bookleafTheme.colors.textMuted,
                      ...bookleafTheme.typography.body,
                      fontSize: 13,
                      lineHeight: 18,
                    }}>
                    {[member.role, member.grade_level, member.interests].filter(Boolean).join(' · ') || '家庭阅读成员'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <View style={{ minWidth: '47%' }}>
                    <PrimaryActionButton
                      label={isActive ? '当前使用中' : '切换为当前成员'}
                      loading={switchUserMutation.isPending}
                      onPress={() => switchUserMutation.mutate(member.id)}
                      variant={isActive ? 'ghost' : 'primary'}
                    />
                  </View>
                  <View style={{ minWidth: '47%' }}>
                    <PrimaryActionButton
                      label="编辑资料"
                      onPress={() =>
                        router.push({
                          params: { memberId: String(member.id) },
                          pathname: '/member-form',
                        })
                      }
                      variant="ghost"
                    />
                  </View>
                  <View style={{ minWidth: '47%' }}>
                    <PrimaryActionButton
                      disabled={isPreviewMode}
                      label="删除成员"
                      loading={deleteUserMutation.isPending}
                      onPress={() => {
                        Alert.alert('确认删除', `要删除成员「${member.name}」吗？`, [
                          { style: 'cancel', text: '保留' },
                          {
                            style: 'destructive',
                            text: '删除',
                            onPress: () => deleteUserMutation.mutate(member.id),
                          },
                        ]);
                      }}
                      variant="ghost"
                    />
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
