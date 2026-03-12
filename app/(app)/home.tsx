import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { AvatarSwitcher } from '@/components/avatar-switcher';
import { BookCarouselCard } from '@/components/book-carousel-card';
import { CabinetStatusCard } from '@/components/cabinet-status-card';
import { GlassPillButton } from '@/components/glass-pill-button';
import { GoalProgressCard } from '@/components/goal-progress-card';
import { MemberSwitcherSheet } from '@/components/member-switcher-sheet';
import { ScreenShell } from '@/components/screen-shell';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import {
  useCompartmentsQuery,
  useCurrentUserQuery,
  useMemberBooklistQuery,
  useMemberStatsQuery,
  useSwitchUserMutation,
  useUsersQuery,
} from '@/lib/api/hooks';
import type { BooklistItem } from '@/lib/api/types';
import { buildCabinetStatusSummary, getTimeBasedGreeting } from '@/lib/home-helpers';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/motion';
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
            <GlassPillButton icon="search" onPress={() => router.push('/(app)/library')} />
          </Animated.View>
          <Animated.View
            entering={createStaggeredFadeIn(1)}
            layout={motionTransitions.gentle}
            style={{ gap: 10 }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                fontFamily: bookleafTheme.fonts.medium,
                fontSize: 14,
              }}>
              {connection.displayName}
            </Text>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                fontFamily: bookleafTheme.fonts.heading,
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
                router.push(`/profile/${activeMember.id}`);
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
          <BookCarouselCard items={booklist} />
        </Animated.View>
        {usersQuery.error || compartmentsQuery.error || statsQuery.error ? (
          <Animated.View
            entering={createStaggeredFadeIn(5)}
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
                fontFamily: bookleafTheme.fonts.semiBold,
                fontSize: 15,
              }}>
              书柜数据还在同步中
            </Text>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                fontFamily: bookleafTheme.fonts.body,
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
        onSelectMember={(memberId) => switchUserMutation.mutateAsync(memberId)}
      />
    </>
  );
}
