import { Redirect, useRouter } from 'expo-router';
import { Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { BookCarouselCard } from '@/components/cards/book-carousel-card';
import { SectionCard } from '@/components/surfaces/section-card';
import { ShortcutCard } from '@/components/actions/shortcut-card';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { useBorrowLogsQuery, useMemberBooklistQuery } from '@/lib/api/react-query/hooks';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function LibraryRoute() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const memberId = useSessionStore((state) => state.currentMemberId);
  const booklistQuery = useMemberBooklistQuery(memberId);
  const borrowLogsQuery = useBorrowLogsQuery(memberId);

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  return (
    <ScreenShell activeNavKey="library">
      <Animated.View entering={createStaggeredFadeIn(0)} style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.heading,
            fontSize: 40,
          }}>
          家庭书库
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            ...bookleafTheme.typography.body,
            fontSize: 15,
            lineHeight: 22,
          }}>
          书架推荐、必读书目和最近的借阅动态都会集中在这里。
        </Text>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <BookCarouselCard items={booklistQuery.data ?? []} />
      </Animated.View>
      <Animated.View
        entering={createStaggeredFadeIn(2)}
        layout={motionTransitions.gentle}>
        <SectionCard
          description="在书库里不只是看书单，也可以直接进入管理和取书流程。"
          title="继续操作">
          <Text
            selectable
            style={{
              color: bookleafTheme.colors.textMuted,
              ...bookleafTheme.typography.body,
              fontSize: 14,
              lineHeight: 20,
            }}>
            先整理必读书，再把孩子真正想读的那一本取出来。
          </Text>
          <Animated.View
            entering={createStaggeredFadeIn(3)}
            layout={motionTransitions.gentle}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <ShortcutCard
              description="新增、删除、完成当前成员的阅读任务。"
              icon="bookmark"
              onPress={() => router.push('/booklist-manage')}
              title="管理书单"
            />
            <ShortcutCard
              description="按书名搜索，立刻发起取书。"
              icon="search"
              onPress={() => router.push('/take-book')}
              title="去取书"
            />
          </Animated.View>
        </SectionCard>
      </Animated.View>
      <Animated.View
        entering={createStaggeredFadeIn(4)}
        layout={motionTransitions.gentle}
        style={{
          backgroundColor: 'rgba(255,255,255,0.76)',
          borderColor: bookleafTheme.colors.cardBorder,
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.xl,
          borderWidth: 1,
          gap: 14,
          padding: 20,
        }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.heading,
            fontSize: 28,
          }}>
          最近借阅
        </Text>
        {(borrowLogsQuery.data ?? []).slice(0, 6).map((log, index) => (
          <Animated.View
            entering={createStaggeredFadeIn(index, 45)}
            key={`${log.title ?? 'log'}-${index}`}
            layout={motionTransitions.gentle}
            style={{
              backgroundColor: bookleafTheme.colors.surfaceMuted,
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.lg,
              gap: 4,
              padding: 14,
            }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                ...bookleafTheme.typography.semiBold,
                fontSize: 15,
              }}>
              {log.title ?? '书架动态'}
            </Text>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                ...bookleafTheme.typography.body,
                fontSize: 12,
              }}>
              {log.action} · {log.action_time ?? log.time ?? '刚刚'}
            </Text>
          </Animated.View>
        ))}
      </Animated.View>
    </ScreenShell>
  );
}
