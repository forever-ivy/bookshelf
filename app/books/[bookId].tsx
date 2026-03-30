import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { SearchResultCard } from '@/components/search/search-result-card';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import {
  useBookDetailQuery,
  useCollaborativeBooksQuery,
  useCreateBooklistMutation,
  useCreateBorrowOrderMutation,
  useFavoritesQuery,
  useHybridBooksQuery,
  useSimilarBooksQuery,
  useToggleFavoriteMutation,
} from '@/hooks/use-library-app-data';

export default function BookDetailRoute() {
  const params = useLocalSearchParams<{ bookId?: string }>();
  const bookId = Number(params.bookId);
  const { theme } = useAppTheme();
  const router = useRouter();
  const detailQuery = useBookDetailQuery(bookId);
  const collaborativeQuery = useCollaborativeBooksQuery(bookId);
  const favoritesQuery = useFavoritesQuery();
  const hybridQuery = useHybridBooksQuery(bookId);
  const similarQuery = useSimilarBooksQuery(bookId);
  const createBooklistMutation = useCreateBooklistMutation();
  const borrowMutation = useCreateBorrowOrderMutation();
  const favoriteMutation = useToggleFavoriteMutation();
  const [actionError, setActionError] = React.useState<string | null>(null);

  if (!Number.isFinite(bookId)) {
    return null;
  }

  const book = detailQuery.data?.catalog;
  const isFavorite = Boolean(
    favoritesQuery.data?.some((item) => item.book.id === bookId)
  );
  const detailError = detailQuery.error ?? favoritesQuery.error;
  const collaborativeBooks =
    collaborativeQuery.data?.length ? collaborativeQuery.data : detailQuery.data?.peopleAlsoBorrowed ?? [];
  const similarBooks = similarQuery.data?.length ? similarQuery.data : detailQuery.data?.relatedBooks ?? [];
  const hybridBooks = hybridQuery.data ?? [];

  return (
    <ProtectedRoute>
      <PageShell headerTitle="图书详情" mode="workspace" showBackButton>
        {detailError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(detailError, '图书详情暂时不可用，请检查 catalog 和 favorites 接口。')}
            title="图书详情联调失败"
            tone="danger"
          />
        ) : null}

        {actionError ? (
          <StateMessageCard description={actionError} title="操作没有完成" tone="danger" />
        ) : null}

        {book ? (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              gap: theme.spacing.md,
              padding: theme.spacing.xl,
            }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {book.locationNote}
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 26,
            }}>
            {book.title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 21,
            }}>
            {book.summary}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {book.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radii.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}>
                <Text
                  style={{
                    color: theme.colors.primaryStrong,
                    ...theme.typography.semiBold,
                    fontSize: 12,
                  }}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <PillButton
                href={undefined}
                label={borrowMutation.isPending ? '借阅中…' : '立即借阅'}
                onPress={async () => {
                  try {
                    setActionError(null);
                    const order = await borrowMutation.mutateAsync({
                      bookId: book.id,
                      deliveryTarget: '阅览室座位',
                      mode: 'robot_delivery',
                    });
                    router.push(`/orders/${order.id}`);
                  } catch (error) {
                    setActionError(getLibraryErrorMessage(error, '借阅下单失败，请稍后重试。'));
                  }
                }}
                variant="accent"
              />
            <PillButton
              href={undefined}
              label={
                favoriteMutation.isPending
                  ? '收藏中…'
                  : isFavorite
                    ? '已收藏'
                    : '加入收藏'
              }
              onPress={async () => {
                try {
                  setActionError(null);
                  await favoriteMutation.mutateAsync(book.id);
                } catch (error) {
                  setActionError(getLibraryErrorMessage(error, '收藏状态更新失败，请稍后重试。'));
                }
              }}
              variant="soft"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <PillButton
              href={`/borrow/${book.id}?mode=robot_delivery`}
              label="请求配送"
              variant="soft"
            />
            <PillButton
              href={`/borrow/${book.id}?mode=cabinet_pickup`}
              label="到柜自取"
              variant="glass"
            />
          </View>
          <PillButton
            href={undefined}
            label={createBooklistMutation.isPending ? '加入中…' : '加入稍后阅读'}
            onPress={async () => {
              try {
                setActionError(null);
                await createBooklistMutation.mutateAsync({
                  bookIds: [book.id],
                  description: `来自《${book.title}》的待读标记`,
                  title: '稍后阅读',
                });
                router.push('/(tabs)/me');
              } catch (error) {
                setActionError(getLibraryErrorMessage(error, '加入书单失败，请稍后重试。'));
              }
            }}
            variant="soft"
          />
          </View>
        ) : null}

      {detailQuery.data?.recommendationReason ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="推荐理由" />
          <View
            style={{
              backgroundColor: theme.colors.primarySoft,
              borderRadius: theme.radii.lg,
              gap: theme.spacing.sm,
              padding: theme.spacing.xl,
            }}>
            <Text
              style={{
                color: theme.colors.primaryStrong,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              {detailQuery.data.recommendationReason}
            </Text>
          </View>
        </View>
      ) : null}

        <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="目录" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.sm,
            padding: theme.spacing.lg,
          }}>
          {detailQuery.data?.catalog.contents.map((chapter) => (
            <Text
              key={chapter}
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 13,
              }}>
              • {chapter}
            </Text>
          ))}
        </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="借过这本书的人还借了什么" />
        <View style={{ gap: theme.spacing.lg }}>
          {collaborativeBooks.map((item) => (
            <SearchResultCard
              key={item.id}
              availability={item.availabilityLabel}
              author={item.author}
              coverTone={item.coverTone}
              eta={item.etaLabel}
              href={`/books/${item.id}`}
              location={item.cabinetLabel}
              reason={item.recommendationReason}
              title={item.title}
            />
          ))}
          {!collaborativeBooks.length ? (
            <StateMessageCard
              description={
                collaborativeQuery.error
                  ? getLibraryErrorMessage(collaborativeQuery.error, '协同推荐暂时不可用。')
                  : '等更多读者借阅过这本书后，这里会出现协同过滤结果。'
              }
              title="协同推荐还在生成"
            />
          ) : null}
        </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="相似图书" />
        <View style={{ gap: theme.spacing.lg }}>
          {similarBooks.map((item) => (
            <SearchResultCard
              key={item.id}
              availability={item.availabilityLabel}
              author={item.author}
              coverTone={item.coverTone}
              eta={item.etaLabel}
              href={`/books/${item.id}`}
              location={item.cabinetLabel}
              reason={item.recommendationReason}
              title={item.title}
            />
          ))}
          {!similarBooks.length ? (
            <StateMessageCard
              description={
                similarQuery.error
                  ? getLibraryErrorMessage(similarQuery.error, '相似图书服务暂时不可用。')
                  : '还没有足够的内容特征来生成相似图书。'
              }
              title="相似图书暂时为空"
            />
          ) : null}
        </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="综合推荐" />
          <View style={{ gap: theme.spacing.lg }}>
            {hybridBooks.map((item) => (
              <SearchResultCard
                key={item.id}
                availability={item.availabilityLabel}
                author={item.author}
                coverTone={item.coverTone}
                eta={item.etaLabel}
                href={`/books/${item.id}`}
                location={item.cabinetLabel}
                reason={item.recommendationReason}
                title={item.title}
              />
            ))}
            {!hybridBooks.length ? (
              <StateMessageCard
                description={
                  hybridQuery.error
                    ? getLibraryErrorMessage(hybridQuery.error, '混合推荐暂时不可用。')
                    : '混合推荐会在内容相似度和借阅行为信号都足够时出现。'
                }
                title="综合推荐正在准备"
              />
            ) : null}
          </View>
        </View>
      </PageShell>
    </ProtectedRoute>
  );
}
