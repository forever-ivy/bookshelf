import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { AppIcon } from '@/components/base/app-icon';
import { EditorialIllustration } from '@/components/base/editorial-illustration';
import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { SearchResultCard } from '@/components/search/search-result-card';
import { PageShell } from '@/components/navigation/page-shell';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { useBooklistsQuery, useRemoveBookFromBooklistMutation } from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';
import { getLibraryErrorMessage } from '@/lib/api/client';

function BooklistDetailSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.lg }} testID="booklist-detail-skeleton">
      <LoadingSkeletonCard>
        <LoadingSkeletonText lineHeight={24} widths={['58%']} />
        <LoadingSkeletonText lineHeight={16} widths={['92%', '74%']} />
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={28} width={84} />
      </LoadingSkeletonCard>
      <LoadingSkeletonCard>
        <LoadingSkeletonBlock height={16} width="32%" />
        <LoadingSkeletonText lineHeight={14} widths={['88%', '80%', '72%']} />
      </LoadingSkeletonCard>
    </View>
  );
}

export default function BooklistDetailRoute() {
  const params = useLocalSearchParams<{ booklistId: string }>();
  const booklistId = String(params.booklistId ?? '');
  const booklistsQuery = useBooklistsQuery();
  const removeBookMutation = useRemoveBookFromBooklistMutation();
  const { theme } = useAppTheme();

  const allBooklists = React.useMemo(
    () => [...(booklistsQuery.data?.systemItems ?? []), ...(booklistsQuery.data?.customItems ?? [])],
    [booklistsQuery.data]
  );
  const booklist = allBooklists.find((item) => item.id === booklistId) ?? null;
  const showSkeleton = !booklistsQuery.data && Boolean(booklistsQuery.isFetching);
  const showBooklistEmptyState = Boolean(booklist && booklist.books.length === 0);
  const isEditableBooklist = booklist?.source === 'custom';

  return (
    <ProtectedRoute>
      <PageShell mode="workspace" pageTitle="书单详情">
        {showSkeleton ? <BooklistDetailSkeleton /> : null}

        {booklistsQuery.isError ? (
          <StateMessageCard
            description="书单暂时不可用，请稍后重试。"
            title="书单加载失败"
            tone="danger"
          />
        ) : null}

        {!showSkeleton && !booklistsQuery.isError && !booklist ? (
          <View style={{ gap: theme.spacing.lg }}>
            <EditorialIllustration
              height={180}
              source={appArtwork.notionEmptySearchCollection}
              testID="booklist-not-found-artwork"
            />
            <StateMessageCard
              description="这份书单可能已被删除，或者还没有同步到当前设备。"
              title="未找到这份书单"
            />
          </View>
        ) : null}

        {booklist ? (
          <>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.xl,
                borderWidth: 1,
                gap: theme.spacing.md,
                padding: theme.spacing.xl,
              }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.heading,
                  fontSize: 24,
                  lineHeight: 30,
                }}>
                {booklist.title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 22,
                }}>
                {booklist.description?.trim() || '这份书单里整理了你准备继续看的图书。'}
              </Text>
              <View
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radii.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}>
                <Text
                  style={{
                    color: theme.colors.primaryStrong,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {booklist.books.length} 本图书
                </Text>
              </View>
            </View>

            <View style={{ gap: theme.spacing.md }}>
              <SectionTitle title="书单图书" />
              {showBooklistEmptyState ? (
                <View style={{ gap: theme.spacing.lg }}>
                  <EditorialIllustration
                    height={176}
                    source={appArtwork.notionBooklistEmpty}
                    testID="booklist-empty-artwork"
                  />
                  <StateMessageCard
                    description="先从首页推荐或搜索结果里挑一本到这份书单，慢慢把阅读路径整理出来。"
                    title="书单暂时还是空的"
                  />
                </View>
              ) : (
                <View style={{ gap: theme.spacing.lg }}>
                  {booklist.books.map((item) => (
                    <View key={item.id} style={{ gap: theme.spacing.sm }}>
                      <SearchResultCard
                        availability={item.availabilityLabel}
                        author={item.author}
                        coverTone={item.coverTone}
                        eta={item.etaLabel}
                        href={`/books/${item.id}`}
                        location={item.cabinetLabel}
                        reason={item.recommendationReason}
                        summary={item.summary}
                        title={item.title}
                      />
                      {isEditableBooklist ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={async () => {
                            try {
                              await removeBookMutation.mutateAsync({
                                bookId: item.id,
                                booklistId,
                              });
                              toast.success('已从书单移除');
                            } catch (error) {
                              toast.error(getLibraryErrorMessage(error, '移出书单失败，请稍后重试。'));
                            }
                          }}
                          style={({ pressed }) => ({
                            alignSelf: 'flex-end',
                            opacity: pressed ? 0.92 : 1,
                          })}
                          testID={`booklist-remove-book-${item.id}`}>
                          <View
                            style={{
                              alignItems: 'center',
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.borderStrong,
                              borderRadius: theme.radii.pill,
                              borderWidth: 1,
                              flexDirection: 'row',
                              gap: 8,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                            }}>
                            <AppIcon color={theme.colors.text} name="minus" size={16} />
                            <Text
                              style={{
                                color: theme.colors.text,
                                ...theme.typography.medium,
                                fontSize: 13,
                              }}>
                              移出书单
                            </Text>
                          </View>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}
      </PageShell>
    </ProtectedRoute>
  );
}
