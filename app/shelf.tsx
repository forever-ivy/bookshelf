import React from 'react';
import { Alert, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ShortcutCard } from '@/components/actions/shortcut-card';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { useActiveMember } from '@/hooks/use-active-member';
import { useCompartmentsQuery, useTakeBookMutation } from '@/lib/api/react-query/hooks';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';
import { Redirect, useRouter } from 'expo-router';

export default function ShelfScreen() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const { activeMember } = useActiveMember();
  const compartmentsQuery = useCompartmentsQuery();
  const takeBookMutation = useTakeBookMutation();

  if (!connection) {
    return <Redirect href="/connect" />;
  }

  const compartments = compartmentsQuery.data ?? [];
  const occupiedCount = compartments.filter((item) => item.status === 'occupied').length;
  const availableCount = compartments.filter((item) => item.status !== 'occupied').length;

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={`查看 ${connection.displayName} 的每一个格口状态，也可以直接替 ${activeMember?.name ?? '读者'} 发起取书。`}
          title="家庭书架"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <ShortcutCard
              description="改用书名搜索要借的书。"
              icon="search"
              onPress={() => router.push('/take-book')}
              title="文本取书"
            />
            <ShortcutCard
              description="拍照识别后把书放回家庭书架。"
              icon="camera"
              onPress={() => router.push('/store-book')}
              title="去存书"
            />
          </View>
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description={`当前在架 ${occupiedCount} 本，空闲 ${availableCount} 格。`}
          title="格口总览">
          {isPreviewMode ? (
            <StateCard
              description="预览模式里可以浏览格口布局，但不会真的向书柜发送开门指令。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {compartmentsQuery.isLoading ? (
            <StateCard
              description="正在从书柜同步格口状态。"
              title="书架更新中"
            />
          ) : null}
          {compartmentsQuery.error ? (
            <StateCard
              description="书柜暂时没有返回格口数据。你可以稍后重试，或先回到连接页确认书柜地址。"
              title="书架暂时不可用"
              variant="error"
            />
          ) : null}
          {!compartmentsQuery.isLoading && !compartments.length ? (
            <StateCard
              description="后端还没有返回任何格口。等书柜同步完成后，这里会自动出现书架布局。"
              title="还没有书架数据"
            />
          ) : null}
          {!!compartments.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {compartments.map((compartment, index) => {
                const isOccupied = compartment.status === 'occupied';

                return (
                  <Animated.View
                    entering={createStaggeredFadeIn(index, 35)}
                    key={compartment.cid}
                    layout={motionTransitions.gentle}
                    style={{
                      backgroundColor: isOccupied
                        ? 'rgba(255,255,255,0.82)'
                        : bookleafTheme.colors.surfaceSoft,
                      borderColor: isOccupied
                        ? bookleafTheme.colors.cardBorder
                        : 'rgba(23,32,51,0.05)',
                      borderCurve: 'continuous',
                      borderRadius: bookleafTheme.radii.lg,
                      borderWidth: 1,
                      gap: 12,
                      minWidth: '47%',
                      padding: 16,
                    }}>
                    <View style={{ gap: 4 }}>
                      <Text
                        selectable
                        style={{
                          color: bookleafTheme.colors.textMuted,
                          fontFamily: bookleafTheme.fonts.medium,
                          fontSize: 12,
                        }}>
                        第 {compartment.cid} 格
                      </Text>
                      <Text
                        selectable
                        style={{
                          color: bookleafTheme.colors.text,
                          fontFamily: bookleafTheme.fonts.semiBold,
                          fontSize: 16,
                          lineHeight: 22,
                        }}>
                        {isOccupied ? compartment.book ?? '在架书籍' : '空闲中'}
                      </Text>
                      <Text
                        selectable
                        style={{
                          color: bookleafTheme.colors.textMuted,
                          fontFamily: bookleafTheme.fonts.body,
                          fontSize: 12,
                        }}>
                        {isOccupied
                          ? `坐标 ${compartment.x + 1}-${compartment.y + 1}`
                          : '可以作为下一本回架的位置'}
                      </Text>
                    </View>
                    {isOccupied ? (
                      <PrimaryActionButton
                        disabled={isPreviewMode || takeBookMutation.isPending}
                        label="从这个格口取书"
                        loading={takeBookMutation.isPending}
                        onPress={() => {
                          Alert.alert(
                            '确认取书',
                            `要从第 ${compartment.cid} 格取出《${compartment.book ?? '这本书'}》吗？`,
                            [
                              { style: 'cancel', text: '再想想' },
                              {
                                style: 'destructive',
                                text: '确认取书',
                                onPress: () =>
                                  takeBookMutation.mutate({
                                    cid: compartment.cid,
                                    title: compartment.book ?? undefined,
                                  }),
                              },
                            ]
                          );
                        }}
                      />
                    ) : null}
                  </Animated.View>
                );
              })}
            </View>
          ) : null}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
