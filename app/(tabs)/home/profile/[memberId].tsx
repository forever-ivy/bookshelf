import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedCountText } from '@/components/base/animated-count-text';
import { AvatarGlyph } from '@/components/member/avatar-glyph';
import { BookCarouselCard } from '@/components/cards/book-carousel-card';
import { GlassPillButton } from '@/components/actions/glass-pill-button';
import { GoalProgressCard } from '@/components/cards/goal-progress-card';
import { SectionCard } from '@/components/surfaces/section-card';
import { ShortcutCard } from '@/components/actions/shortcut-card';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import {
  useMemberBadgesQuery,
  useMemberBooklistQuery,
  useMemberStatsQuery,
  useUsersQuery,
} from '@/lib/api/react-query/hooks';
import {
  getMemberAccentColor,
  getMemberRoleLabel,
} from '@/lib/presentation/member-presentation';
import {
  createSlowFadeIn,
  createStaggeredFadeIn,
  motionTransitions,
} from '@/lib/presentation/motion';
import {
  getProfileAvatarValue,
  resolveProfileMember,
} from '@/lib/presentation/profile-helpers';
import { useSessionStore } from '@/stores/session-store';

export default function ProfileRoute() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const numericMemberId = Number(memberId);
  const usersQuery = useUsersQuery();
  const statsQuery = useMemberStatsQuery(numericMemberId);
  const booklistQuery = useMemberBooklistQuery(numericMemberId);
  const badgesQuery = useMemberBadgesQuery(numericMemberId);

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  const stats = statsQuery.data;
  const member = resolveProfileMember(usersQuery.data ?? [], numericMemberId, stats);
  const badges = badgesQuery.data?.badges ?? [];
  const progressTarget = Math.max(stats?.weekly_goal ?? 10, 1);
  const progressCurrent = stats?.weekly_takes ?? 0;

  return (
    <ScreenShell activeNavKey="home">
      <Animated.View
        entering={createStaggeredFadeIn(0)}
        layout={motionTransitions.gentle}
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <GlassPillButton icon="back" onPress={() => router.back()} />
        <GlassPillButton icon="share" onPress={() => {}} />
      </Animated.View>
      <Animated.View
        entering={createSlowFadeIn(0)}
        layout={motionTransitions.gentle}
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.76)',
          borderColor: bookleafTheme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: 40,
          borderWidth: 1,
          gap: 14,
          padding: 28,
        }}>
        <Animated.View
          layout={motionTransitions.snappy}
          style={{
            alignItems: 'center',
            backgroundColor: getMemberAccentColor(member),
            borderCurve: 'continuous',
            borderRadius: 38,
            height: 88,
            justifyContent: 'center',
            width: 88,
          }}>
          <AvatarGlyph size={38} value={getProfileAvatarValue(member)} />
        </Animated.View>
        <View style={{ gap: 6 }}>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.text,
              ...bookleafTheme.typography.heading,
              fontSize: 36,
              textAlign: 'center',
            }}>
            {member?.name ?? '读者'}
          </Text>
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.textMuted,
              ...bookleafTheme.typography.medium,
              fontSize: 14,
              textAlign: 'center',
            }}>
            {getMemberRoleLabel(member)}
          </Text>
        </View>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <GoalProgressCard
          buttonLabel="分享进度"
          currentValue={progressCurrent}
          progress={progressCurrent / progressTarget}
          subtitle="每周借阅次数和目标进度，都会从现有的 Python 书柜统计中同步过来。"
          targetValue={progressTarget}
          title="每日阅读目标"
        />
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <ProfileMetric label="今日操作" value={stats?.today_ops ?? 0} />
        <ProfileMetric label="累计借阅" value={stats?.total_take ?? 0} />
      </View>
      <Animated.View
        entering={createStaggeredFadeIn(2)}
        layout={motionTransitions.gentle}
        style={{
          backgroundColor: 'rgba(255,255,255,0.76)',
          borderColor: bookleafTheme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.xl,
          borderWidth: 1,
          gap: 12,
          padding: 22,
        }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.heading,
            fontSize: 28,
          }}>
          里程碑
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {badges.length ? (
            badges.map((badge, index) => (
              <Animated.View
                entering={createStaggeredFadeIn(index, 40)}
                key={badge.badge_key}
                layout={motionTransitions.snappy}
                style={{
                  backgroundColor: bookleafTheme.colors.surfaceMuted,
                  borderCurve: 'continuous',
                  borderRadius: bookleafTheme.radii.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}>
                <Text
                  selectable
                  style={{
                    color: bookleafTheme.colors.text,
                    ...bookleafTheme.typography.semiBold,
                    fontSize: 13,
                  }}>
                  {badge.badge_key}
                </Text>
              </Animated.View>
            ))
          ) : (
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                ...bookleafTheme.typography.body,
                fontSize: 14,
              }}>
              孩子开始借书和还书后，这里会逐步解锁阅读徽章。
            </Text>
          )}
        </View>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(3)} layout={motionTransitions.gentle}>
        <SectionCard
          description="档案页现在也可以直接进入目标编辑和成员管理，不需要再绕回设置页。"
          title="继续调整">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <ShortcutCard
              description="修改这位成员的每周阅读目标。"
              icon="target"
              onPress={() =>
                router.push({
                  params: { memberId: String(numericMemberId) },
                  pathname: '/goal-settings',
                })
              }
              title="编辑目标"
            />
            <ShortcutCard
              description="查看或维护全家的成员资料。"
              icon="users"
              onPress={() => router.push('/members')}
              title="管理成员"
            />
          </View>
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(4)} layout={motionTransitions.gentle}>
        <BookCarouselCard items={booklistQuery.data ?? []} />
      </Animated.View>
    </ScreenShell>
  );
}

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <Animated.View
      entering={createStaggeredFadeIn(1, 50)}
      layout={motionTransitions.gentle}
      style={{
        backgroundColor: bookleafTheme.colors.surfaceSoft,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.lg,
        flex: 1,
        gap: 4,
        padding: 16,
      }}>
      <Text
        selectable
        style={{
          color: bookleafTheme.colors.textMuted,
          ...bookleafTheme.typography.body,
          fontSize: 12,
        }}>
        {label}
      </Text>
      <AnimatedCountText
        style={{
          color: bookleafTheme.colors.text,
          ...bookleafTheme.typography.bold,
          fontSize: 22,
          fontVariant: ['tabular-nums'],
        }}
        value={value}
      />
    </Animated.View>
  );
}
