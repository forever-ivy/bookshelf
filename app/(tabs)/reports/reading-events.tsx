import { Redirect } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FieldInput } from '@/components/base/field-input';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import {
  useCreateReadingEventMutation,
  useReadingEventsQuery,
} from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function ReadingEventsScreen() {
  const { theme } = useBookleafTheme();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const canManage = currentAccount?.system_role === 'admin';
  const [eventType, setEventType] = React.useState('');
  const [source, setSource] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [bookId, setBookId] = React.useState('');
  const [metadata, setMetadata] = React.useState('');
  const [filterType, setFilterType] = React.useState('');
  const eventsQuery = useReadingEventsQuery({
    event_type: filterType.trim() || undefined,
  });
  const createEventMutation = useCreateReadingEventMutation();
  const events = eventsQuery.data ?? [];

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
          description="查看后端已经记录的阅读事件，也可以补记一条新的阅读动作。"
          title="阅读事件"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="管理员可以补记事件；普通用户只浏览现有事件。"
          title="记录新事件">
          {isPreviewMode ? (
            <StateCard
              description="预览模式会展示阅读事件表单，但不会真的写回后端。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {!canManage ? (
            <StateCard
              description="普通用户可以看事件列表，但不在这里写入新事件。"
              title="当前为只读模式"
              variant="warning"
            />
          ) : null}
          <FieldInput
            hint="例如：take、finish、note"
            label="事件类型"
            onChangeText={setEventType}
            placeholder="例如：finish"
            value={eventType}
          />
          <FieldInput
            label="来源"
            onChangeText={setSource}
            placeholder="例如：app"
            value={source}
          />
          <FieldInput
            keyboardType="number-pad"
            label="成员 ID"
            onChangeText={setUserId}
            placeholder="例如：2"
            value={userId}
          />
          <FieldInput
            keyboardType="number-pad"
            label="图书 ID"
            onChangeText={setBookId}
            placeholder="例如：401"
            value={bookId}
          />
          <FieldInput
            hint="需要时可以放一段 JSON 字符串。"
            label="附加信息"
            multiline
            onChangeText={setMetadata}
            placeholder='例如：{"minutes":20}'
            value={metadata}
          />
          <PrimaryActionButton
            disabled={!canManage || isPreviewMode || !eventType.trim()}
            label="记录阅读事件"
            loading={createEventMutation.isPending}
            onPress={async () => {
              await createEventMutation.mutateAsync({
                book_id: bookId.trim() ? Number(bookId.trim()) : null,
                event_type: eventType.trim(),
                metadata_json: metadata.trim() || undefined,
                source: source.trim() || undefined,
                user_id: userId.trim() ? Number(userId.trim()) : null,
              });
              setEventType('');
              setSource('');
              setUserId('');
              setBookId('');
              setMetadata('');
            }}
          />
          {createEventMutation.error ? (
            <StateCard
              description={createEventMutation.error.message}
              title="阅读事件还没有保存成功"
              variant="error"
            />
          ) : null}
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description="可以先按事件类型筛一下，再看最近的阅读事件时间线。"
          title="事件列表">
          <FieldInput
            label="筛选事件类型"
            onChangeText={setFilterType}
            placeholder="例如：finish"
            value={filterType}
          />
          {eventsQuery.isLoading ? (
            <StateCard title="阅读事件加载中" description="正在同步最近的阅读事件。" />
          ) : null}
          {eventsQuery.error ? (
            <StateCard
              description={eventsQuery.error.message}
              title="阅读事件不可用"
              variant="error"
            />
          ) : null}
          {!eventsQuery.isLoading && !events.length ? (
            <StateCard title="还没有阅读事件" description="当前筛选下没有匹配的阅读事件。" />
          ) : null}
          {events.map((event, index) => (
            <Animated.View
              entering={createStaggeredFadeIn(index, 35)}
              key={event.id}
              layout={motionTransitions.gentle}
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderCurve: 'continuous',
                borderRadius: theme.radii.lg,
                gap: 4,
                padding: 14,
              }}>
              <Text
                selectable
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
                }}>
                {event.event_type}
              </Text>
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 12,
                  lineHeight: 18,
                }}>
                {[
                  event.user_name ?? (event.user_id ? `成员 #${event.user_id}` : '未指定成员'),
                  event.book_title ?? (event.book_id ? `图书 #${event.book_id}` : '未指定图书'),
                  event.event_time,
                ].join(' · ')}
              </Text>
            </Animated.View>
          ))}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
