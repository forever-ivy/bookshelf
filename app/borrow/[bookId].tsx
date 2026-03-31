import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { PillButton } from '@/components/base/pill-button';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { useBookDetailQuery, useCreateBorrowOrderMutation } from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';

const MODE_OPTIONS = [
  { label: '到柜自取', value: 'cabinet_pickup' },
  { label: '机器人配送', value: 'robot_delivery' },
];

function BorrowRouteSkeleton() {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard testID="borrow-route-skeleton">
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <LoadingSkeletonBlock borderRadius={theme.radii.md} height={44} width="48%" />
        <LoadingSkeletonBlock borderRadius={theme.radii.md} height={44} width="48%" />
      </View>
      <View style={{ gap: 8 }}>
        <LoadingSkeletonBlock height={12} width={120} />
        <LoadingSkeletonBlock borderRadius={theme.radii.md} height={50} />
      </View>
      <LoadingSkeletonCard
        style={{
          backgroundColor: theme.colors.warningSoft,
          padding: theme.spacing.md,
        }}>
        <LoadingSkeletonText lineHeight={12} widths={['44%', '36%']} />
      </LoadingSkeletonCard>
      <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={48} />
    </LoadingSkeletonCard>
  );
}

export default function BorrowRoute() {
  const params = useLocalSearchParams<{ bookId: string; mode?: string; target?: string }>();
  const bookId = Number(params.bookId);
  const bookQuery = useBookDetailQuery(bookId);
  const createBorrowOrderMutation = useCreateBorrowOrderMutation();
  const router = useRouter();
  const { theme } = useAppTheme();
  const [mode, setMode] = React.useState<'cabinet_pickup' | 'robot_delivery'>(
    params.mode === 'cabinet_pickup' ? 'cabinet_pickup' : 'robot_delivery'
  );
  const [target, setTarget] = React.useState(params.target ?? '阅览室 A-12');
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const book = bookQuery.data?.catalog;
  const showBorrowSkeleton = !book && !bookQuery.isError && Boolean(bookQuery.isFetching);

  return (
    <ProtectedRoute>
      <PageShell
        headerDescription={book ? `${book.title} · ${book.etaLabel} · ${book.cabinetLabel}` : undefined}
        headerTitle="借阅下单"
        insetBottom={72}
        mode="workspace">
        {submitError ? (
          <StateMessageCard description={submitError} title="借阅请求没有完成" tone="danger" />
        ) : null}

        {showBorrowSkeleton ? (
          <BorrowRouteSkeleton />
        ) : book ? (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              gap: theme.spacing.lg,
              padding: theme.spacing.xl,
            }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              {MODE_OPTIONS.map((item) => {
                const selected = mode === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setMode(item.value as 'cabinet_pickup' | 'robot_delivery')}
                    style={{
                      backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surfaceMuted,
                      borderColor: selected ? theme.colors.primaryStrong : theme.colors.borderStrong,
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      flex: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}>
                    <Text
                      style={{
                        color: selected ? theme.colors.primaryStrong : theme.colors.textMuted,
                        ...theme.typography.semiBold,
                        fontSize: 14,
                        textAlign: 'center',
                      }}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: theme.colors.textSoft, ...theme.typography.medium, fontSize: 12 }}>
                配送地点 / 取书地点
              </Text>
              <TextInput
                onChangeText={setTarget}
                placeholder={mode === 'robot_delivery' ? '例如：阅览室 A-12' : '例如：主馆 1 楼书柜'}
                style={{
                  backgroundColor: theme.colors.surfaceStrong,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  color: theme.colors.text,
                  minHeight: 50,
                  paddingHorizontal: 14,
                }}
                value={target}
              />
            </View>

            <View
              style={{
                backgroundColor: theme.colors.warningSoft,
                borderRadius: theme.radii.md,
                padding: theme.spacing.md,
              }}>
              <Text style={{ color: theme.colors.warning, ...theme.typography.medium, fontSize: 13 }}>
                预计等待时间 · {book.etaLabel}
              </Text>
            </View>

            <PillButton
              label={createBorrowOrderMutation.isPending ? '下单中...' : '确认借阅'}
              onPress={async () => {
                try {
                  setSubmitError(null);
                  const order = await createBorrowOrderMutation.mutateAsync({
                    bookId,
                    deliveryTarget: target,
                    mode,
                  });
                  router.replace(`/orders/${order.id}`);
                } catch (error) {
                  setSubmitError(getLibraryErrorMessage(error, '借阅下单失败，请稍后重试。'));
                }
              }}
              variant="accent"
            />
          </View>
        ) : null}
      </PageShell>
    </ProtectedRoute>
  );
}
