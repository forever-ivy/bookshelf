import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { AvatarSwitcher } from '@/components/member/avatar-switcher';
import { BookCarouselCard } from '@/components/cards/book-carousel-card';
import { CabinetStatusCard } from '@/components/cards/cabinet-status-card';
import { GlassPillButton } from '@/components/actions/glass-pill-button';
import { GoalProgressCard } from '@/components/cards/goal-progress-card';
import { MemberSwitcherSheet } from '@/components/member/member-switcher-sheet';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { ShortcutCard } from '@/components/actions/shortcut-card';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import {
  useCompartmentsQuery,
  useCurrentUserQuery,
  useMemberBooklistQuery,
  useMemberStatsQuery,
  useSwitchUserMutation,
  useUsersQuery,
} from '@/lib/api/react-query/hooks';
import type { BooklistItem } from '@/lib/api/contracts/types';
import {
  buildCabinetStatusSummary,
  getTimeBasedGreeting,
} from '@/lib/presentation/home-helpers';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

const emptyBookPreview: BooklistItem[] = [
  { done: false, id: -1, note: '先为孩子设置一个阅读目标，家庭书架就会开始运转。', title: '开始设置阅读目标' },
  { done: false, id: -2, note: '完成第一次同步后，书柜会把推荐书目展示在这里。', title: '书库预览' },
];

export default function HomeRoute() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const currentMemberId = useSessionStore((state) => state.currentMemberId);
  const setCurrentMemberId = useSessionStore((state) => state.setCurrentMemberId);
  const [isMemberSheetOpen, setIsMemberSheetOpen] = React.useState(false);
  const scrollOffset = useSharedValue(0);
  const usersQuery = useUsersQuery();
  const currentUserQuery = useCurrentUserQuery();
  const compartmentsQuery = useCompartmentsQuery();
  const switchUserMutation = useSwitchUserMutation();

  const members = usersQuery.data ?? [];
  const activeMember =
    members.find((member) => member.id === currentMemberId) ??
    currentUserQuery.data ??
    members[0] ??
    null;

  React.useEffect(() => {
    if (!currentMemberId && activeMember?.id) {
      setCurrentMemberId(activeMember.id);
    }
  }, [activeMember?.id, currentMemberId, setCurrentMemberId]);

  const statsQuery = useMemberStatsQuery(activeMember?.id);
  const booklistQuery = useMemberBooklistQuery(activeMember?.id);

  const greeting = getTimeBasedGreeting();
  const progressTarget = Math.max(statsQuery.data?.weekly_goal ?? 10, 1);
  const progressCurrent = statsQuery.data?.weekly_takes ?? 0;
  const progress = progressCurrent / progressTarget;
  const booklist = booklistQuery.data?.length ? booklistQuery.data : emptyBookPreview;
  const headerMotionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [0, 60], [1, 0.86], 'clamp'),
    transform: [
      {
        translateY: interpolate(scrollOffset.value, [0, 80], [0, -12], 'clamp'),
      },
    ],
  }));

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  const summary = buildCabinetStatusSummary(
    compartmentsQuery.data ?? [],
    connection.displayName
  );

  return (
    <>
      <ScreenShell activeNavKey="home" scrollOffset={scrollOffset}>
        <Animated.View
          style={[
            {
              gap: 24,
            },
            headerMotionStyle,
          ]}>
          <Animated.View
            entering={createStaggeredFadeIn(0)}
            layout={motionTransitions.gentle}
            style={{ alignItems: 'center', flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <AvatarSwitcher
                activeMember={activeMember}
                members={members}
                onPress={() => setIsMemberSheetOpen(true)}
              />
            </View>
            <GlassPillButton icon="search" onPress={() => router.push('/library')} />
          </Animated.View>
          <Animated.View
            entering={createStaggeredFadeIn(1)}
            layout={motionTransitions.gentle}
            style={{ gap: 10 }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                ...bookleafTheme.typography.medium,
                fontSize: 14,
              }}>
              {connection.displayName}
            </Text>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                ...bookleafTheme.typography.heading,
                fontSize: 42,
                lineHeight: 48,
              }}>
              {greeting}，{activeMember?.name ?? '读者'}
            </Text>
          </Animated.View>
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
          <CabinetStatusCard summary={summary} />
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(3)} layout={motionTransitions.gentle}>
          <GoalProgressCard
            currentValue={progressCurrent}
            onPress={() => {
              if (activeMember?.id) {
                router.push(`/home/profile/${activeMember.id}`);
              }
            }}
            progress={Number.isFinite(progress) ? progress : 0}
            subtitle={
              statsQuery.data?.goal_reached
                ? '本周目标进展顺利，打开孩子档案看看最近的阅读动态。'
                : '这周再借几本书，就能把家庭阅读节奏重新带起来。'
            }
            targetValue={progressTarget}
            title="阅读目标"
          />
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(4)} layout={motionTransitions.gentle}>
          <SectionCard
            description="围绕家庭阅读最常用的操作，我已经替你铺成了四条快入口。"
            title="现在就开始">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <ShortcutCard
                description="查看每一个格口的占用状态。"
                icon="cabinet"
                onPress={() => router.push('/shelf')}
                title="看书架"
              />
              <ShortcutCard
                description="拍书或选图，把书放回家庭书架。"
                icon="camera"
                onPress={() => router.push('/store-book')}
                title="去存书"
              />
              <ShortcutCard
                description="按书名搜索，直接替孩子取书。"
                icon="search"
                onPress={() => router.push('/take-book')}
                title="帮孩子取书"
              />
              <ShortcutCard
                description="调整每周借阅目标。"
                icon="target"
                onPress={() => router.push('/goal-settings')}
                title="修改目标"
              />
            </View>
          </SectionCard>
        </Animated.View>
        <Animated.View entering={createStaggeredFadeIn(5)} layout={motionTransitions.gentle}>
          <BookCarouselCard items={booklist} />
        </Animated.View>
        {usersQuery.error || compartmentsQuery.error || statsQuery.error ? (
          <Animated.View
            entering={createStaggeredFadeIn(6)}
            layout={motionTransitions.gentle}
            style={{
              backgroundColor: 'rgba(255,255,255,0.72)',
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.lg,
              gap: 6,
              padding: 16,
            }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                ...bookleafTheme.typography.semiBold,
                fontSize: 15,
              }}>
              书柜数据还在同步中
            </Text>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                ...bookleafTheme.typography.body,
                fontSize: 13,
                lineHeight: 18,
              }}>
              在 Python 后端返回成员数据前，部分卡片可能暂时为空。
            </Text>
          </Animated.View>
        ) : null}
      </ScreenShell>
      <MemberSwitcherSheet
        activeMemberId={activeMember?.id}
        isOpen={isMemberSheetOpen}
        members={members}
        onClose={() => setIsMemberSheetOpen(false)}
        onSelectMember={(memberId: number) => switchUserMutation.mutateAsync(memberId)}
      />
    </>
  );
}
