import { Redirect } from 'expo-router';
import { Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { BookCarouselCard } from '@/components/cards/book-carousel-card';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { useBorrowLogsQuery, useMemberBooklistQuery } from '@/lib/api/react-query/hooks';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function LibraryRoute() {
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
            fontFamily: bookleafTheme.fonts.heading,
            fontSize: 40,
          }}>
          家庭书库
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            fontFamily: bookleafTheme.fonts.body,
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
            fontFamily: bookleafTheme.fonts.heading,
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
                fontFamily: bookleafTheme.fonts.semiBold,
                fontSize: 15,
              }}>
              {log.title ?? '书架动态'}
            </Text>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                fontFamily: bookleafTheme.fonts.body,
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
