import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FieldInput } from '@/components/base/field-input';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { useBooksQuery, useCreateBookMutation } from '@/lib/api/react-query/hooks';
import { appRoutes, getLibraryBookHref } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function BooksScreen() {
  const { theme } = useBookleafTheme();
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const canManage = currentAccount?.system_role === 'admin';
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [newTitle, setNewTitle] = React.useState('');
  const [newAuthor, setNewAuthor] = React.useState('');
  const [newCategory, setNewCategory] = React.useState('');
  const booksQuery = useBooksQuery({
    category: category.trim() || undefined,
    q: query.trim() || undefined,
  });
  const createBookMutation = useCreateBookMutation();
  const books = booksQuery.data ?? [];

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
          description="搜索当前书库中的图书资料，也可以补录一本新书。"
          title="图书管理"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="先筛一筛书库里的图书，再决定是否需要补录新书。"
          title="搜索与筛选">
          <FieldInput
            label="搜索"
            onChangeText={setQuery}
            placeholder="按书名或作者搜索"
            value={query}
          />
          <FieldInput
            label="分类"
            onChangeText={setCategory}
            placeholder="例如：自然故事"
            value={category}
          />
          <PrimaryActionButton
            label="打开完整新建页"
            onPress={() => router.push(appRoutes.libraryBooksNew)}
            variant="ghost"
          />
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(2)} layout={motionTransitions.gentle}>
        <SectionCard
          description="管理员可以在这里快速补录一本书，普通用户只浏览。"
          title="快速补录">
          {isPreviewMode ? (
            <StateCard
              description="预览模式只展示图书表单，不会真的写入后端。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {!canManage ? (
            <StateCard
              description="当前账号只能浏览图书资料，无法新增或编辑。"
              title="当前为只读模式"
              variant="warning"
            />
          ) : null}
          <FieldInput
            label="书名"
            onChangeText={setNewTitle}
            placeholder="例如：月球上的图书馆"
            value={newTitle}
          />
          <FieldInput
            label="作者"
            onChangeText={setNewAuthor}
            placeholder="例如：林月"
            value={newAuthor}
          />
          <FieldInput
            label="分类"
            onChangeText={setNewCategory}
            placeholder="例如：幻想冒险"
            value={newCategory}
          />
          <PrimaryActionButton
            disabled={!canManage || isPreviewMode || !newTitle.trim()}
            label="保存图书"
            loading={createBookMutation.isPending}
            onPress={async () => {
              const result = await createBookMutation.mutateAsync({
                author: newAuthor.trim() || undefined,
                category: newCategory.trim() || undefined,
                title: newTitle.trim(),
              });
              setNewTitle('');
              setNewAuthor('');
              setNewCategory('');
              router.push(getLibraryBookHref(result.book.id));
            }}
          />
          {createBookMutation.error ? (
            <StateCard
              description={createBookMutation.error.message}
              title="图书还没有保存成功"
              variant="error"
            />
          ) : null}
        </SectionCard>
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(3)} layout={motionTransitions.gentle}>
        <SectionCard
          description="点击任意一条记录，可以继续查看详情或进入编辑页。"
          title="当前书库">
          {booksQuery.isLoading ? (
            <StateCard title="图书加载中" description="正在同步当前书库。" />
          ) : null}
          {booksQuery.error ? (
            <StateCard
              description={booksQuery.error.message}
              title="图书列表不可用"
              variant="error"
            />
          ) : null}
          {!booksQuery.isLoading && !books.length ? (
            <StateCard title="还没有图书" description="当前筛选条件下还没有匹配的图书。" />
          ) : null}
          {books.map((book, index) => (
            <Animated.View
              entering={createStaggeredFadeIn(index, 35)}
              key={book.id}
              layout={motionTransitions.gentle}
              style={{
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.cardBorder,
                borderCurve: 'continuous',
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: 12,
                padding: 16,
              }}>
              <View style={{ gap: 6 }}>
                <Text
                  selectable
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 17,
                  }}>
                  {book.title}
                </Text>
                <Text
                  selectable
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 19,
                  }}>
                  {[
                    book.author ?? '未知作者',
                    book.category ?? '未分类',
                    book.is_on_shelf ? '已在书架' : '暂未上架',
                  ].join(' · ')}
                </Text>
              </View>
              <PrimaryActionButton
                label={canManage ? '查看或编辑' : '查看详情'}
                onPress={() => router.push(getLibraryBookHref(book.id))}
                variant="ghost"
              />
            </Animated.View>
          ))}
        </SectionCard>
      </Animated.View>
    </ScreenShell>
  );
}
