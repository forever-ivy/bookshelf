import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
} from '@/components/base/loading-skeleton';
import { AppIcon } from '@/components/base/app-icon';
import { PillButton } from '@/components/base/pill-button';
import { BooklistEntryCard } from '@/components/favorites/booklist-entry-card';
import { FavoritesPreviewCard } from '@/components/favorites/favorites-preview-card';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { getLibraryErrorMessage } from '@/lib/api/client';
import {
  useBooklistsQuery,
  useCreateBooklistMutation,
  useFavoritesQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRouter } from 'expo-router';

function BooklistsSkeleton() {
  return (
    <View style={{ gap: 12 }} testID="favorites-booklists-skeleton">
      {Array.from({ length: 2 }, (_, index) => (
        <LoadingSkeletonCard key={`favorites-booklist-skeleton-${index}`}>
          <LoadingSkeletonBlock height={16} width="36%" />
          <LoadingSkeletonBlock height={12} width="72%" />
          <LoadingSkeletonBlock height={12} width="24%" />
        </LoadingSkeletonCard>
      ))}
    </View>
  );
}

function FavoritesPreviewSkeleton() {
  return (
    <LoadingSkeletonCard testID="favorites-preview-skeleton">
      <LoadingSkeletonBlock height={18} width="28%" />
      <LoadingSkeletonBlock height={1} width="100%" />
      <LoadingSkeletonBlock height={74} width="100%" />
      <LoadingSkeletonBlock height={74} width="100%" />
    </LoadingSkeletonCard>
  );
}

export function FavoritesTabContent() {
  const favoritesQuery = useFavoritesQuery();
  const booklistsQuery = useBooklistsQuery();
  const createBooklistMutation = useCreateBooklistMutation();
  const { theme } = useAppTheme();
  const router = useRouter();
  const [booklistsExpanded, setBooklistsExpanded] = React.useState(false);
  const [createModalVisible, setCreateModalVisible] = React.useState(false);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftDescription, setDraftDescription] = React.useState('');
  const showFavoritesSkeleton = !favoritesQuery.data && Boolean(favoritesQuery.isFetching);
  const showBooklistsSkeleton = !booklistsQuery.data && Boolean(booklistsQuery.isFetching);
  const previewFavorites = favoritesQuery.data?.slice(0, 2) ?? [];
  const customBooklists = booklistsQuery.data?.customItems ?? [];
  const hasMoreBooklists = customBooklists.length > 3;
  const visibleCustomBooklists = booklistsExpanded ? customBooklists : customBooklists.slice(0, 3);

  const closeCreateModal = React.useCallback(() => {
    setCreateModalVisible(false);
    setDraftTitle('');
    setDraftDescription('');
  }, []);

  const handleCreateBooklist = React.useCallback(async () => {
    const title = draftTitle.trim();
    const description = draftDescription.trim();

    if (!title || createBooklistMutation.isPending) {
      return;
    }

    try {
      await createBooklistMutation.mutateAsync({
        bookIds: [],
        description: description || null,
        title,
      });
      closeCreateModal();
      toast.success('书单已创建');
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '创建书单失败，请稍后重试。'));
    }
  }, [closeCreateModal, createBooklistMutation, draftDescription, draftTitle]);

  return (
    <>
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="书单" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            overflow: 'hidden',
          }}
          testID="favorites-booklists-panel">
          <View
            style={{
              alignItems: 'center',
              borderBottomColor: theme.colors.borderSoft,
              borderBottomWidth: 1,
              flexDirection: 'row',
              gap: theme.spacing.md,
              justifyContent: 'space-between',
              padding: theme.spacing.lg,
            }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                flex: 1,
                fontSize: 18,
              }}>
              我的书单
            </Text>
            <Pressable
              accessibilityLabel="新建书单"
              accessibilityRole="button"
              onPress={() => setCreateModalVisible(true)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.92 : 1,
              })}
              testID="favorites-booklists-create">
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: theme.colors.primarySoft,
                  borderColor: theme.colors.primaryStrong,
                  borderRadius: theme.radii.pill,
                  borderWidth: 1,
                  height: 38,
                  justifyContent: 'center',
                  width: 38,
                }}>
                <AppIcon color={theme.colors.primaryStrong} name="plus" size={18} />
              </View>
            </Pressable>
          </View>

          {showBooklistsSkeleton ? (
            <View style={{ padding: theme.spacing.lg }}>
              <BooklistsSkeleton />
            </View>
          ) : customBooklists.length > 0 ? (
            <View
              style={{
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}>
              {visibleCustomBooklists.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                    borderTopWidth: index === 0 ? 0 : 1,
                    paddingTop: index === 0 ? 0 : theme.spacing.md,
                  }}>
                  <BooklistEntryCard
                    bookCount={item.books.length}
                    description={item.description}
                    onPress={() => router.push(`/booklists/${item.id}`)}
                    testID={`favorites-booklist-row-${item.id}`}
                    title={item.title}
                    variant="embedded"
                  />
                </View>
              ))}

              {hasMoreBooklists ? (
                <View
                  style={{
                    borderTopColor: theme.colors.borderSoft,
                    borderTopWidth: 1,
                    paddingTop: theme.spacing.md,
                  }}>
                  <PillButton
                    label={booklistsExpanded ? '收起' : `展开全部 ${customBooklists.length} 个`}
                    onPress={() => setBooklistsExpanded((value) => !value)}
                    testID="favorites-booklists-toggle"
                    variant="glass"
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <View
              style={{
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.xl,
              }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 16 }}>
                还没有自建书单
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        {showFavoritesSkeleton ? (
          <FavoritesPreviewSkeleton />
        ) : previewFavorites.length > 0 ? (
          <FavoritesPreviewCard
            items={previewFavorites.map((item) => ({
              author: item.book.author,
              coverTone: item.book.coverTone,
              href: `/books/${item.book.id}`,
              id: item.id,
              summary: item.book.summary,
              title: item.book.title,
            }))}
            onMorePress={() => router.push('/favorites')}
          />
        ) : null}
        {favoritesQuery.data?.length === 0 && !favoritesQuery.isError && !showFavoritesSkeleton ? (
          <StateMessageCard
            description="在详情页点一下「加入收藏」，常读和想读的书就会汇总到这里。"
            title="还没有收藏图书"
          />
        ) : null}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={closeCreateModal}
        transparent
        visible={createModalVisible}>
        <Pressable
          onPress={closeCreateModal}
          style={{
            backgroundColor: 'rgba(26, 24, 21, 0.48)',
            flex: 1,
            padding: theme.spacing.lg,
          }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{
              flex: 1,
              justifyContent: 'center',
            }}>
            <Pressable>
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderSoft,
                  borderRadius: theme.radii.xl,
                  borderWidth: 1,
                  gap: theme.spacing.lg,
                  padding: theme.spacing.xl,
                }}
                testID="favorites-booklists-create-modal">
                <View style={{ gap: theme.spacing.xs }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.heading,
                      fontSize: 22,
                      letterSpacing: -0.4,
                    }}>
                    新建书单
                  </Text>
                </View>

                <ScrollView
                  contentContainerStyle={{ gap: theme.spacing.md }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>
                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: theme.colors.textSoft,
                        ...theme.typography.medium,
                        fontSize: 12,
                      }}>
                      书单名称
                    </Text>
                    <TextInput
                      autoCapitalize="words"
                      onChangeText={setDraftTitle}
                      placeholder="请输入书单名称"
                      placeholderTextColor="rgba(31, 30, 27, 0.42)"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderStrong,
                        borderRadius: theme.radii.lg,
                        borderWidth: 1,
                        color: theme.colors.text,
                        fontSize: 15,
                        minHeight: 52,
                        paddingHorizontal: 16,
                      }}
                      testID="favorites-booklist-title-input"
                      value={draftTitle}
                    />
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text
                      style={{
                        color: theme.colors.textSoft,
                        ...theme.typography.medium,
                        fontSize: 12,
                      }}>
                      书单描述
                    </Text>
                    <TextInput
                      multiline
                      onChangeText={setDraftDescription}
                      placeholder="请输入书单描述"
                      placeholderTextColor="rgba(31, 30, 27, 0.42)"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderStrong,
                        borderRadius: theme.radii.lg,
                        borderWidth: 1,
                        color: theme.colors.text,
                        fontSize: 15,
                        minHeight: 96,
                        paddingHorizontal: 16,
                        paddingTop: 14,
                        textAlignVertical: 'top',
                      }}
                      testID="favorites-booklist-description-input"
                      value={draftDescription}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.xs }}>
                    <View style={{ flex: 1 }}>
                      <PillButton
                        label="取消"
                        onPress={closeCreateModal}
                        testID="favorites-booklist-cancel"
                        variant="soft"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PillButton
                        label={createBooklistMutation.isPending ? '创建中…' : '创建'}
                        onPress={handleCreateBooklist}
                        testID="favorites-booklist-submit"
                        variant="accent"
                      />
                    </View>
                  </View>
                </ScrollView>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </>
  );
}
