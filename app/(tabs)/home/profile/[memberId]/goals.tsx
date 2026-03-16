import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useActiveMember } from '@/hooks/use-active-member';
import { useGoalQuery, useMemberStatsQuery, useSetGoalMutation } from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

const goalSuggestions = [3, 5, 7];

export default function GoalSettingsScreen() {
  const { theme } = useBookleafTheme();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const { activeMember, members } = useActiveMember();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const selectedMemberId = memberId ? Number(memberId) : activeMember?.id;
  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? activeMember;
  const goalQuery = useGoalQuery(selectedMemberId);
  const statsQuery = useMemberStatsQuery(selectedMemberId);
  const setGoalMutation = useSetGoalMutation(selectedMemberId);
  const [weeklyTarget, setWeeklyTarget] = React.useState(1);

  React.useEffect(() => {
    if (goalQuery.data?.weekly_target) {
      setWeeklyTarget(goalQuery.data.weekly_target);
    }
  }, [goalQuery.data?.weekly_target]);

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
          description={`给 ${selectedMember?.name ?? '当前读者'} 设一个更合适的每周借阅目标，让首页和档案页的进度更贴近真实节奏。`}
          title="阅读目标"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="这里使用独立的阅读目标接口，不再只依赖首页的派生统计。"
          title="每周目标">
          {isPreviewMode ? (
            <StateCard
              description="预览模式只展示目标设置体验，不会真的保存。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {goalQuery.isLoading ? (
            <StateCard
              description="正在同步当前成员已有的目标设定。"
              title="目标加载中"
            />
          ) : null}
          {goalQuery.error ? (
            <StateCard
              description="当前目标暂时没有加载出来，你仍然可以重新设定一个新的周目标。"
              title="没有拿到旧目标"
              variant="error"
            />
          ) : null}
          <View
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.cardBorder,
              borderCurve: 'continuous',
              borderRadius: 30,
              borderWidth: 1,
              gap: 14,
              padding: 18,
            }}>
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.medium,
                fontSize: 13,
              }}>
              目标借阅本数 / 每周
            </Text>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 18 }}>
              <StepperButton
                label="−"
                onPress={() => setWeeklyTarget((value) => Math.max(1, value - 1))}
              />
              <Text
                selectable
                style={{
                  color: theme.colors.text,
                  ...theme.typography.heading,
                  fontSize: 48,
                }}>
                {weeklyTarget}
              </Text>
              <StepperButton
                label="+"
                onPress={() => setWeeklyTarget((value) => Math.min(12, value + 1))}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {goalSuggestions.map((value) => (
              <Pressable
                accessibilityRole="button"
                key={value}
                onPress={() => setWeeklyTarget(value)}
                style={{
                  backgroundColor:
                    weeklyTarget === value
                      ? theme.colors.primary
                      : theme.colors.surfaceMuted,
                  borderCurve: 'continuous',
                  borderRadius: theme.radii.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}>
                <Text
                  selectable
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 13,
                  }}>
                  {value} 本 / 周
                </Text>
              </Pressable>
            ))}
          </View>
          <PrimaryActionButton
            disabled={isPreviewMode}
            label="保存阅读目标"
            loading={setGoalMutation.isPending}
            onPress={async () => {
              await setGoalMutation.mutateAsync(weeklyTarget);
            }}
          />
          {setGoalMutation.error ? (
            <StateCard
              description={setGoalMutation.error.message}
              title="目标还没保存成功"
              variant="error"
            />
          ) : null}
          {setGoalMutation.isSuccess ? (
            <StateCard
              description={`目标已经更新为每周 ${weeklyTarget} 本，首页和档案页会自动刷新。`}
              icon="check"
              title="阅读目标已保存"
              variant="success"
            />
          ) : null}
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description="设置目标时，也可以顺手参考这周已经借了多少本。"
          title="当前节奏">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <MetricCard label="本周已借" value={statsQuery.data?.weekly_takes ?? 0} />
            <MetricCard label="今天操作" value={statsQuery.data?.today_ops ?? 0} />
          </View>
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}

function StepperButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { theme } = useBookleafTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceMuted,
        borderCurve: 'continuous',
        borderRadius: theme.radii.pill,
        height: 46,
        justifyContent: 'center',
        width: 46,
      }}>
      <Text
        selectable
        style={{
          color: theme.colors.text,
          ...theme.typography.bold,
          fontSize: 22,
        }}>
        {label}
      </Text>
    </Pressable>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  const { theme } = useBookleafTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surfaceSoft,
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
      <Text
        selectable
        style={{
          color: theme.colors.text,
          ...theme.typography.heading,
          fontSize: 28,
        }}>
        {value}
      </Text>
    </View>
  );
}
