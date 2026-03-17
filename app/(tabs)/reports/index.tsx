import { Redirect, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AnimatedCountText } from '@/components/base/animated-count-text';
import { ShortcutCard } from '@/components/actions/shortcut-card';
import { TwoColumnGrid } from '@/components/layout/two-column-grid';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useMonthlyReportQuery, useWeeklyReportQuery } from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import {
  createSlowFadeIn,
  createStaggeredFadeIn,
  motionTransitions,
} from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function ReportsRoute() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const memberId = useSessionStore((state) => state.currentMemberId);
  const weeklyReportQuery = useWeeklyReportQuery(memberId);
  const monthlyReportQuery = useMonthlyReportQuery();

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (!isAuthenticated) {
    return <Redirect href={appRoutes.authLogin} />;
  }

  return (
    <ScreenShell activeNavKey="reports" showTopOverlay={false}>
      <Animated.View entering={createStaggeredFadeIn(0)} style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 40,
          }}>
          阅读报告
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 15,
            lineHeight: 22,
          }}>
          孩子每周阅读亮点和家庭月度总结，都会直接从书柜后端同步到这里。
        </Text>
      </Animated.View>
      <ReportCard
        body={weeklyReportQuery.data?.summary ?? '暂时还没有本周阅读总结。'}
        eyebrow="本周"
        index={1}
        isDark={theme.isDark}
        title="孩子阅读总结"
      />
      <ReportCard
        body={monthlyReportQuery.data?.summary ?? '暂时还没有家庭月度报告。'}
        eyebrow="本月"
        index={2}
        isDark={theme.isDark}
        title="家庭阅读快照"
      />
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
        }}>
        <MetricBlock
          label="本月借阅"
          numericValue={monthlyReportQuery.data?.total_books ?? 0}
        />
        <MetricBlock
          label="热门分类"
          value={monthlyReportQuery.data?.top_category ?? '-'}
        />
      </View>
      <SectionCard

        title="更多记录">
        <TwoColumnGrid>
          <ShortcutCard

            icon="bookmark"
            onPress={() => router.push(appRoutes.reportsReadingEvents)}
            title="阅读事件"
          />
        </TwoColumnGrid>
      </SectionCard>
    </ScreenShell>
  );
}

function ReportCard({
  body,
  eyebrow,
  index,
  isDark,
  title,
}: {
  body: string;
  eyebrow: string;
  index: number;
  isDark: boolean;
  title: string;
}) {
  const { theme } = useBookleafTheme();

  return (
    <Animated.View
      entering={createSlowFadeIn(index)}
      layout={motionTransitions.gentle}
      style={{
        backgroundColor: theme.colors.overlaySurface,
        borderColor: theme.colors.cardBorder,
        borderCurve: 'continuous',
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        gap: 12,
        padding: 22,
      }}>
      <Text
        selectable
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.bold,
          fontSize: 12,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}>
        {eyebrow}
      </Text>
      <Text
        selectable
        style={{
          color: theme.colors.text,
          ...theme.typography.heading,
          fontSize: 30,
        }}>
        {title}
      </Text>
      <Text
        selectable
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 15,
          lineHeight: 24,
        }}>
        {body}
      </Text>
    </Animated.View>
  );
}

function MetricBlock({
  label,
  numericValue,
  value,
}: {
  label: string;
  numericValue?: number;
  value?: string;
}) {
  const { theme } = useBookleafTheme();

  return (
    <Animated.View
      entering={createStaggeredFadeIn(3, 60)}
      layout={motionTransitions.gentle}
      style={{
        backgroundColor: theme.colors.surfaceMuted,
        borderCurve: 'continuous',
        borderRadius: theme.radii.lg,
        flex: 1,
        gap: 6,
        padding: 16,
      }}>
      <Text
        selectable
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 12,
        }}>
        {label}
      </Text>
      {typeof numericValue === 'number' ? (
        <AnimatedCountText
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 18,
            fontVariant: ['tabular-nums'],
          }}
          value={numericValue}
        />
      ) : (
        <Text
          numberOfLines={2}
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 18,
          }}>
          {value}
        </Text>
      )}
    </Animated.View>
  );
}
