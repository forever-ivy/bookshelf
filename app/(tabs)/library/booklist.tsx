import React from 'react';
import { Alert, Text, View } from 'react-native';
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
import {
  useAddBooklistItemMutation,
  useDeleteBooklistItemMutation,
  useMarkBooklistDoneMutation,
  useMemberBooklistQuery,
} from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function BooklistManageScreen() {
  const { theme } = useBookleafTheme();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const { activeMember } = useActiveMember();
  const booklistQuery = useMemberBooklistQuery(activeMember?.id);
  const addBooklistItemMutation = useAddBooklistItemMutation(activeMember?.id);
  const deleteBooklistItemMutation = useDeleteBooklistItemMutation(activeMember?.id);
  const markBooklistDoneMutation = useMarkBooklistDoneMutation(activeMember?.id);
  const [title, setTitle] = React.useState('');
  const [note, setNote] = React.useState('');

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (!isAuthenticated) {
    return <Redirect href={appRoutes.authLogin} />;
  }

  const items = booklistQuery.data ?? [];

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={`为 ${activeMember?.name ?? '当前读者'} 添加必读书目，或整理已经完成的阅读任务。`}
          title="书单管理"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="先把这周想读的书安排进去，家庭书架会更有节奏。"
          title="新增必读书">
          {isPreviewMode ? (
            <StateCard
              description="预览模式只展示表单布局，不会真的写入书单。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          <FieldInput
            label="书名"
            onChangeText={setTitle}
            placeholder="例如：月光图书馆"
            value={title}
          />
          <FieldInput
            hint="可以写一句家长提醒或阅读建议。"
            label="留言"
            multiline
            onChangeText={setNote}
            placeholder="例如：这周末一起读第一章。"
            value={note}
          />
          <PrimaryActionButton
            disabled={isPreviewMode || !title.trim()}
            label="添加到书单"
            loading={addBooklistItemMutation.isPending}
            onPress={async () => {
              await addBooklistItemMutation.mutateAsync({
                note: note.trim() || undefined,
                title: title.trim(),
              });
              setTitle('');
              setNote('');
            }}
          />
          {addBooklistItemMutation.error ? (
            <StateCard
              description={addBooklistItemMutation.error.message}
              title="这本书还没加进书单"
              variant="error"
            />
          ) : null}
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description="完成阅读后可以直接在这里打勾，也能删除不再需要的任务。"
          title="当前书单">
          {booklistQuery.isLoading ? (
            <StateCard
              description="正在从书柜同步最新书单。"
              title="书单加载中"
            />
          ) : null}
          {booklistQuery.error ? (
            <StateCard
              description="书单暂时不可用，请稍后重试。"
              title="还没拿到书单"
              variant="error"
            />
          ) : null}
          {!booklistQuery.isLoading && !items.length ? (
            <StateCard
              description="先为孩子加一两本本周想读的书，这里就会变成家庭阅读清单。"
              title="还没有必读书"
            />
          ) : null}
          {items.map((item, index) => (
            <Animated.View
              entering={createStaggeredFadeIn(index, 35)}
              key={item.id}
              layout={motionTransitions.gentle}
              style={{
                backgroundColor: item.done ? theme.colors.surfaceSoft : theme.colors.surfaceElevated,
                borderColor: theme.colors.cardBorder,
                borderCurve: 'continuous',
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: 14,
                padding: 16,
              }}>
              <View style={{ gap: 4 }}>
                <Text
                  selectable
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                  }}>
                  {item.title}
                </Text>
                <Text
                  selectable
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 18,
                  }}>
                  {item.note || (item.done ? '已经完成这本书的阅读计划。' : '还没有补充阅读提醒。')}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {!item.done ? (
                  <View style={{ flex: 1 }}>
                    <PrimaryActionButton
                      disabled={isPreviewMode}
                      label="标记已完成"
                      loading={markBooklistDoneMutation.isPending}
                      onPress={() => markBooklistDoneMutation.mutate(item.id)}
                    />
                  </View>
                ) : null}
                <View style={{ flex: 1 }}>
                  <PrimaryActionButton
                    disabled={isPreviewMode}
                    label="删除"
                    loading={deleteBooklistItemMutation.isPending}
                    onPress={() => {
                      Alert.alert('确认删除', `要把《${item.title}》从书单里移除吗？`, [
                        { style: 'cancel', text: '保留' },
                        {
                          style: 'destructive',
                          text: '删除',
                          onPress: () => deleteBooklistItemMutation.mutate(item.id),
                        },
                      ]);
                    }}
                    variant="ghost"
                  />
                </View>
              </View>
            </Animated.View>
          ))}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
