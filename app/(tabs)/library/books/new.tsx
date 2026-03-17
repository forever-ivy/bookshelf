import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import Animated from 'react-native-reanimated';

import { PrimaryActionButton } from '@/components/actions/primary-action-button';
import { FieldInput } from '@/components/base/field-input';
import { FlowScreenHeader } from '@/components/navigation/flow-screen-header';
import { ScreenShell } from '@/components/navigation/screen-shell';
import { SectionCard } from '@/components/surfaces/section-card';
import { StateCard } from '@/components/surfaces/state-card';
import { useCreateBookMutation } from '@/lib/api/react-query/hooks';
import { appRoutes, getLibraryBookHref } from '@/lib/app/routes';
import { createStaggeredFadeIn, motionTransitions } from '@/lib/presentation/motion';
import { useSessionStore } from '@/stores/session-store';

export default function NewBookScreen() {
  const router = useRouter();
  const connection = useSessionStore((state) => state.connection);
  const currentAccount = useSessionStore((state) => state.currentAccount);
  const isAuthenticated = useSessionStore((state) =>
    typeof state.isAuthenticated === 'boolean' ? state.isAuthenticated : true
  );
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const canManage = currentAccount?.system_role === 'admin';
  const createBookMutation = useCreateBookMutation();
  const [title, setTitle] = React.useState('');
  const [author, setAuthor] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [publisher, setPublisher] = React.useState('');
  const [description, setDescription] = React.useState('');

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
          description="这里保留完整的新建表单，适合补录书名、作者和简要描述。"
          title="新增图书"
        />
      </Animated.View>
      <Animated.View entering={createStaggeredFadeIn(1)} layout={motionTransitions.gentle}>
        <SectionCard
          description="最少只需要书名，其他字段可以后续再补。"
          title="图书表单">
          {isPreviewMode ? (
            <StateCard
              description="预览模式不会真的保存新图书。"
              title="预览模式不可操作"
              variant="warning"
            />
          ) : null}
          {!canManage ? (
            <StateCard
              description="只有管理员可以新增图书。"
              title="当前为只读模式"
              variant="warning"
            />
          ) : null}
          <FieldInput label="书名" onChangeText={setTitle} placeholder="例如：月球上的图书馆" value={title} />
          <FieldInput label="作者" onChangeText={setAuthor} placeholder="例如：林月" value={author} />
          <FieldInput label="分类" onChangeText={setCategory} placeholder="例如：幻想冒险" value={category} />
          <FieldInput label="出版社" onChangeText={setPublisher} placeholder="例如：晨光出版社" value={publisher} />
          <FieldInput
            hint="可以写一句简要介绍，帮助家长快速识别。"
            label="简介"
            multiline
            onChangeText={setDescription}
            placeholder="例如：一场发生在月光图书馆里的冒险。"
            value={description}
          />
          <PrimaryActionButton
            disabled={!canManage || isPreviewMode || !title.trim()}
            label="保存新图书"
            loading={createBookMutation.isPending}
            onPress={async () => {
              const result = await createBookMutation.mutateAsync({
                author: author.trim() || undefined,
                category: category.trim() || undefined,
                description: description.trim() || undefined,
                publisher: publisher.trim() || undefined,
                title: title.trim(),
              });
              router.replace(getLibraryBookHref(result.book.id));
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
    </ScreenShell>
  );
}
