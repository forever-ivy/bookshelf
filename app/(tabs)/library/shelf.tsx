import React from 'react';
import Animated from 'react-native-reanimated';

import { ShortcutCard } from '@/components/actions/shortcut-card';
import { BookCarouselCard } from '@/components/cards/book-carousel-card';
import { ShelfCabinetPreview } from '@/components/cards/shelf-cabinet-preview';
import { TwoColumnGrid } from '@/components/layout/two-column-grid';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useActiveMember } from '@/hooks/use-active-member';
import type { BooklistItem } from '@/lib/api/contracts/types';
import {
  useCompartmentsQuery,
  useMemberBooklistQuery,
  useTakeBookMutation,
} from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';
import { Redirect, useRouter } from 'expo-router';

const emptyBookPreview: BooklistItem[] = [
  {
    done: false,
    id: -1,
    note: '先为孩子设置一个阅读目标，家庭书架就会开始运转。',
    title: '开始设置阅读目标',
  },
  {
    done: false,
    id: -2,
    note: '完成第一次同步后，书柜会把推荐书目展示在这里。',
    title: '书库预览',
  },
];

export default function ShelfScreen() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const { activeMember } = useActiveMember();
  const compartmentsQuery = useCompartmentsQuery();
  const booklistQuery = useMemberBooklistQuery(activeMember?.id);
  const takeBookMutation = useTakeBookMutation();

  if (!connection) {
    return <Redirect href={appRoutes.connect} />;
  }

  if (!isAuthenticated) {
    return <Redirect href={appRoutes.authLogin} />;
  }

  const compartments = compartmentsQuery.data ?? [];
  const occupiedCount = compartments.filter(
    (item) => item.status === 'occupied'
  ).length;
  const availableCount = compartments.filter((item) => item.status !== 'occupied').length;
  const booklist = booklistQuery.data?.length ? booklistQuery.data : emptyBookPreview;

  return (
    <ScreenShell contentContainerStyle={{ gap: 20 }}>
      <Animated.View entering={createStaggeredFadeIn(0)}>
        <FlowScreenHeader
          description={`查看 ${connection.displayName} 的每一个格口状态，也可以直接替 ${activeMember?.name ?? '读者'} 发起取书。`}
          title="家庭书架"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <BookCarouselCard items={booklist} />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard>
          <TwoColumnGrid>
            <ShortcutCard
              description="改用书名搜索要借的书。"
              icon="search"
              onPress={() => router.push(appRoutes.libraryTakeBook)}
              title="文本取书"
            />
            <ShortcutCard
              description="拍照识别后把书放回家庭书架。"
              icon="camera"
              onPress={() => router.push(appRoutes.libraryStoreBook)}
              title="去存书"
            />
          </TwoColumnGrid>
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(3)} layout={motionTransitions.gentle}>
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
            <ShelfCabinetPreview
              compartments={compartments}
              onTakeBook={(compartment) =>
                takeBookMutation.mutateAsync({
                  cid: compartment.cid,
                  title: compartment.book ?? undefined,
                })
              }
              previewMode={isPreviewMode}
            />
          ) : null}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
