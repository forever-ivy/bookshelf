import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { toast } from 'sonner-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
  type SkeletonWidth,
} from '@/components/base/loading-skeleton';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { SearchResultCard } from '@/components/search/search-result-card';
import { SearchResultCardSkeleton } from '@/components/search/search-result-skeleton';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { resolveBookEtaDisplay } from '@/lib/book-delivery';
import { resolveBookLocationDisplay } from '@/lib/book-location';
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
import { useProfileSheet } from '@/providers/profile-sheet-provider';

function BookDetailHeroSkeleton() {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard testID="book-detail-primary-skeleton">
      <LoadingSkeletonText
        lineHeight={28}
        testIDPrefix="book-detail-primary-skeleton-title"
        widths={['78%', '52%']}
      />
      <LoadingSkeletonBlock height={14} width="36%" />
      <LoadingSkeletonBlock height={12} width="28%" />
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="馆藏与借阅" />
        <View
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            flexDirection: 'row',
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}>
          {['location', 'availability', 'eta'].map((key) => (
            <View key={key} style={{ flex: 1, gap: 6 }}>
              <LoadingSkeletonBlock height={12} width="56%" />
              <LoadingSkeletonBlock height={16} width="78%" />
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={48} width="48%" />
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={48} width="32%" />
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="36%" />
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="36%" />
      </View>
      <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="42%" />
      <LoadingSkeletonText lineHeight={12} widths={['94%', '88%', '66%']} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={28} width={72} />
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={28} width={86} />
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={28} width={74} />
      </View>
    </LoadingSkeletonCard>
  );
}

function BookDetailSectionSkeleton({
  lines,
  testID,
}: {
  lines: SkeletonWidth[];
  testID?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard style={{ padding: theme.spacing.xl }} testID={testID}>
      <LoadingSkeletonText lineHeight={13} widths={lines} />
    </LoadingSkeletonCard>
  );
}

function BookRecommendationListSkeleton({ testID }: { testID?: string }) {
  return (
    <View style={{ gap: 16 }} testID={testID}>
      <SearchResultCardSkeleton testID={`${testID}-1`} />
      <SearchResultCardSkeleton testID={`${testID}-2`} />
    </View>
  );
}

export default function BookDetailRoute() {
  const params = useLocalSearchParams<{ bookId?: string; minimal?: string }>();
  const bookId = Number(params.bookId);
  const isMinimal = params.minimal === 'true';
  const { theme } = useAppTheme();
  const router = useRouter();
  const { openProfileSheet } = useProfileSheet();
  const detailQuery = useBookDetailQuery(bookId);
  const recBookId = isMinimal ? NaN : bookId;
  const collaborativeQuery = useCollaborativeBooksQuery(recBookId);
  const favoritesQuery = useFavoritesQuery();
  const hybridQuery = useHybridBooksQuery(recBookId);
  const similarQuery = useSimilarBooksQuery(recBookId);
  const createBooklistMutation = useCreateBooklistMutation();
  const borrowMutation = useCreateBorrowOrderMutation();
  const favoriteMutation = useToggleFavoriteMutation();

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
  const locationNote = resolveBookLocationDisplay(book?.locationNote ?? book?.cabinetLabel);
  const isDetailLoading = !detailError && !detailQuery.data && Boolean(detailQuery.isFetching);
  const isCollaborativeLoading = Boolean(collaborativeQuery.isFetching) && collaborativeBooks.length === 0;
  const isSimilarLoading = Boolean(similarQuery.isFetching) && similarBooks.length === 0;
  const isHybridLoading = Boolean(hybridQuery.isFetching) && hybridBooks.length === 0;

  return (
    <ProtectedRoute>
      <PageShell mode="workspace">
        {detailError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(detailError, '图书详情暂时不可用，请检查 catalog 和 favorites 接口。')}
            title="图书详情联调失败"
            tone="danger"
          />
        ) : null}

        {isDetailLoading ? <BookDetailHeroSkeleton /> : null}

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
              color: theme.colors.text,
              ...theme.typography.heading,
              fontSize: 26,
            }}>
            {book.title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.semiBold,
              fontSize: 14,
            }}>
            {book.author}
          </Text>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {locationNote}
          </Text>
          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle title="馆藏与借阅" />
            <View
              style={{
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                flexDirection: 'row',
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.colors.textSoft, ...theme.typography.medium, fontSize: 12 }}>
                  馆藏位置
                </Text>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14 }}>
                  {resolveBookLocationDisplay(book.cabinetLabel)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.colors.textSoft, ...theme.typography.medium, fontSize: 12 }}>
                  可借状态
                </Text>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14 }}>
                  {book.availabilityLabel}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: theme.colors.textSoft, ...theme.typography.medium, fontSize: 12 }}>
                  最快到手
                </Text>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14 }}>
                  {resolveBookEtaDisplay(book.etaLabel)}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <PillButton
                href={undefined}
                label={borrowMutation.isPending ? '借阅中…' : '立即借阅'}
                onPress={async () => {
                  try {
                    const order = await borrowMutation.mutateAsync({
                      bookId: book.id,
                      deliveryTarget: '阅览室座位',
                      mode: 'robot_delivery',
                    });
                    router.push(`/orders/${order.id}`);
                  } catch (error) {
                    toast.error(getLibraryErrorMessage(error, '借阅下单失败，请稍后重试。'));
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
                  await favoriteMutation.mutateAsync(book.id);
                } catch (error) {
                  toast.error(getLibraryErrorMessage(error, '收藏状态更新失败，请稍后重试。'));
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
                await createBooklistMutation.mutateAsync({
                  bookIds: [book.id],
                  description: `来自《${book.title}》的待读标记`,
                  title: '稍后阅读',
                });
                openProfileSheet();
              } catch (error) {
                toast.error(getLibraryErrorMessage(error, '加入书单失败，请稍后重试。'));
              }
            }}
            variant="soft"
          />
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
          </View>
        ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="为什么可能适合你" />
        {isDetailLoading ? (
          <BookDetailSectionSkeleton
            lines={['92%', '86%']}
            testID="book-detail-recommendation-skeleton"
          />
        ) : detailQuery.data?.recommendationReason ? (
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
        ) : (
          <StateMessageCard
            description="当前还没有补充出足够明确的适配说明。"
            title="推荐说明正在准备"
          />
        )}
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="目录" />
        {isDetailLoading ? (
          <BookDetailSectionSkeleton
            lines={['88%', '76%', '81%', '64%']}
            testID="book-detail-contents-skeleton"
          />
        ) : detailQuery.data?.catalog.contents.length ? (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              gap: theme.spacing.sm,
              padding: theme.spacing.lg,
            }}>
            {detailQuery.data.catalog.contents.map((chapter) => (
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
        ) : (
          <StateMessageCard description="当前还没有补充这本书的目录信息。" title="目录暂时为空" />
        )}
      </View>

      {!isMinimal ? (
        <>
          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle title="借过这本的人也借了" />
            {isCollaborativeLoading ? (
              <BookRecommendationListSkeleton testID="book-detail-collaborative-skeleton" />
            ) : (
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
                        ? getLibraryErrorMessage(collaborativeQuery.error, '这组延伸借阅暂时不可用。')
                        : '等更多借阅记录积累后，这里会出现更贴近的延伸借阅。'
                    }
                    title="延伸借阅正在准备"
                  />
                ) : null}
              </View>
            )}
          </View>

          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle title="同主题图书" />
            {isSimilarLoading ? (
              <BookRecommendationListSkeleton testID="book-detail-similar-skeleton" />
            ) : (
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
                        ? getLibraryErrorMessage(similarQuery.error, '同主题图书暂时不可用。')
                        : '暂时还没有补充出更贴近的同主题图书。'
                    }
                    title="同主题图书暂时为空"
                  />
                ) : null}
              </View>
            )}
          </View>

          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle title="你可能还想借" />
            {isHybridLoading ? (
              <BookRecommendationListSkeleton testID="book-detail-hybrid-skeleton" />
            ) : (
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
                        ? getLibraryErrorMessage(hybridQuery.error, '补充推荐暂时不可用。')
                        : '后续当馆藏和借阅线索更完整时，会继续补充适合你的图书。'
                    }
                    title="补充推荐正在准备"
                  />
                ) : null}
              </View>
            )}
          </View>
        </>
      ) : null}
      </PageShell>
    </ProtectedRoute>
  );
}
