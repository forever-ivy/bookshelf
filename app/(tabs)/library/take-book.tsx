import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Redirect } from 'expo-router';

import { FieldInput } from '@/components/base/field-input';
import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useActiveMember } from '@/hooks/use-active-member';
import { useMemberBooklistQuery, useTakeBookByTextMutation } from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function TakeBookScreen() {
  const { theme } = useBookleafTheme();
  const connection = useSessionStore((state) => state.connection);
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const { activeMember } = useActiveMember();
  const booklistQuery = useMemberBooklistQuery(activeMember?.id);
  const takeBookByTextMutation = useTakeBookByTextMutation();
  const [query, setQuery] = React.useState('');
  const [lastResult, setLastResult] = React.useState<string | null>(null);

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  const suggestions = (booklistQuery.data ?? []).filter((item) => !item.done).slice(0, 4);

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={`直接替 ${activeMember?.name ?? '当前读者'} 搜索书名，Bookleaf 会优先走文本取书流程。`}
          title="帮孩子取书"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="输入书名、关键词或系列名，书柜会尽量匹配并给出反馈。"
          title="取书指令">
          {isPreviewMode ? (
            <StateCard
              description="预览模式会保留表单和结果布局，但不会真的触发书柜动作。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          <FieldInput
            label="书名或关键词"
            onChangeText={setQuery}
            placeholder="例如：月光图书馆"
            value={query}
          />
          <PrimaryActionButton
            disabled={isPreviewMode || !query.trim()}
            label="开始取书"
            loading={takeBookByTextMutation.isPending}
            onPress={() => {
              Alert.alert('确认取书', `要帮 ${activeMember?.name ?? '当前读者'} 取《${query.trim()}》吗？`, [
                { style: 'cancel', text: '再想想' },
                {
                  style: 'destructive',
                  text: '确认取书',
                    onPress: async () => {
                      const result = await takeBookByTextMutation.mutateAsync(query.trim());
                    setLastResult(
                      result.ai_reply ??
                        ('reply' in result ? result.reply : undefined) ??
                        '书柜已经收到取书请求。'
                    );
                  },
                },
              ]);
            }}
          />
          {takeBookByTextMutation.error ? (
            <StateCard
              description={takeBookByTextMutation.error.message}
              title="这次没有取到书"
              variant="error"
            />
          ) : null}
          {lastResult ? (
            <StateCard
              description={lastResult}
              icon="check"
              title="书柜已经给出反馈"
              variant="success"
            />
          ) : null}
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description="从当前成员的必读书目里直接选，可以更快发起取书。"
          title="快速选择">
          {booklistQuery.isLoading ? (
            <StateCard
              description="正在同步当前成员的必读书目。"
              title="推荐书单加载中"
            />
          ) : null}
          {booklistQuery.error ? (
            <StateCard
              description="书单暂时没有加载出来，不过你仍然可以直接手动输入书名。"
              title="还没拿到推荐书单"
              variant="error"
            />
          ) : null}
          {!booklistQuery.isLoading && !suggestions.length ? (
            <StateCard
              description="当前成员还没有待阅读书单。你可以先去书单管理里添加几本想读的书。"
              title="没有可推荐的书"
            />
          ) : null}
          {!!suggestions.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {suggestions.map((item, index) => (
                <Animated.View
                  entering={createStaggeredFadeIn(index, 40)}
                  key={item.id}
                  layout={motionTransitions.gentle}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setQuery(item.title)}
                    style={{
                      backgroundColor: theme.colors.surfaceMuted,
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
                      {item.title}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ) : null}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
