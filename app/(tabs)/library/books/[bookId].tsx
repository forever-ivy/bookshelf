import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';
import Animated from 'react-native-reanimated';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FieldInput } from '@/components/base/field-input';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookQuery, useUpdateBookMutation } from '@/lib/api/react-query/hooks';
import { appRoutes } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function BookDetailScreen() {
  const params = useLocalSearchParams<{ bookId?: string }>();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const canManage = currentAccount?.system_role === 'admin';
  const numericBookId = Number(params.bookId);
  const bookQuery = useBookQuery(Number.isFinite(numericBookId) ? numericBookId : null);
  const updateBookMutation = useUpdateBookMutation();
  const [title, setTitle] = React.useState('');
  const [author, setAuthor] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [description, setDescription] = React.useState('');

  React.useEffect(() => {
    const book = bookQuery.data;
    if (!book) {
      return;
    }

    setTitle(book.title);
    setAuthor(book.author ?? '');
    setCategory(book.category ?? '');
    setDescription(book.description ?? '');
  }, [bookQuery.data]);

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
          description="查看图书的基础资料，管理员可以继续补齐和修改。"
          title="图书详情"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="这里优先维护书名、作者、分类和一段简短描述。"
          title="图书资料">
          {bookQuery.isLoading ? (
            <StateCard title="图书详情加载中" description="正在同步图书资料。" />
          ) : null}
          {bookQuery.error ? (
            <StateCard
              description={bookQuery.error.message}
              title="图书详情不可用"
              variant="error"
            />
          ) : null}
          {isPreviewMode ? (
            <StateCard
              description="预览模式会展示编辑态，但不会真的写回后端。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {!canManage ? (
            <StateCard
              description="普通用户只能查看图书资料。"
              title="当前为只读模式"
              variant="warning"
            />
          ) : null}
          {bookQuery.data ? (
            <>
              <FieldInput label="书名" onChangeText={setTitle} value={title} />
              <FieldInput label="作者" onChangeText={setAuthor} value={author} />
              <FieldInput label="分类" onChangeText={setCategory} value={category} />
              <FieldInput
                hint="这段描述会帮助家长在列表里更快识别这本书。"
                label="简介"
                multiline
                onChangeText={setDescription}
                value={description}
              />
              <PrimaryActionButton
                disabled={!canManage || isPreviewMode || !title.trim()}
                label="保存修改"
                loading={updateBookMutation.isPending}
                onPress={async () => {
                  await updateBookMutation.mutateAsync({
                    bookId: bookQuery.data!.id,
                    payload: {
                      author: author.trim() || undefined,
                      category: category.trim() || undefined,
                      description: description.trim() || undefined,
                      title: title.trim(),
                    },
                  });
                }}
              />
              {updateBookMutation.error ? (
                <StateCard
                  description={updateBookMutation.error.message}
                  title="图书修改还没有保存成功"
                  variant="error"
                />
              ) : null}
            </>
          ) : null}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
