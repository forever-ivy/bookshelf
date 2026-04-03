import React from 'react';
import { Animated, Easing, LayoutAnimation, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { toast } from 'sonner-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { FavoritesTabContent } from '@/components/favorites/favorites-tab-content';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { BorrowingCard } from '@/components/borrowing/borrowing-card';
import { BorrowingCardSkeleton } from '@/components/borrowing/borrowing-card-skeleton';
import { BorrowingSummary } from '@/components/borrowing/borrowing-summary';
import { BorrowingSummarySkeleton } from '@/components/borrowing/borrowing-summary-skeleton';
import { DynamicFeedSkeleton } from '@/components/borrowing/dynamic-feed-skeleton';
import { PageShell } from '@/components/navigation/page-shell';
import { ProfileSheetTriggerButton } from '@/components/navigation/profile-sheet-trigger-button';
import { ToolbarHeaderRow } from '@/components/navigation/toolbar-header-row';
import { ToolbarProfileAction } from '@/components/navigation/toolbar-profile-action';
import { getLibraryErrorMessage } from '@/lib/api/client';
import type { NotificationItem } from '@/lib/api/types';
import { appArtwork } from '@/lib/app/artwork';
import { resolveBorrowingFilterPalette } from '@/lib/borrowing/helpers';
import { borrowingTabs, statusFilters, type BorrowingTabKey } from '@/lib/borrowing/types';
import { useActivityTimeline } from '@/hooks/use-activity-timeline';
import { useBorrowingActions } from '@/hooks/use-borrowing-actions';
import { useBorrowingOrders } from '@/hooks/use-borrowing-orders';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useHeaderChromeVisibility } from '@/hooks/use-header-chrome-visibility';
import { useNotificationsQuery } from '@/hooks/use-library-app-data';
import { useProfileSheet } from '@/providers/profile-sheet-provider';
import {
  getDismissedNotificationsStorageKey,
  readDismissedNotificationIds,
  writeDismissedNotificationIds,
} from '@/stores';

function getNotificationKindLabel(kind: NotificationItem['kind']) {
  if (kind === 'delivery') return '配送提醒';
  if (kind === 'borrowing') return '借阅提醒';
  if (kind === 'achievement') return '成就更新';
  return '系统提醒';
}

export default function BorrowingRoute() {
  const [activeTab, setActiveTab] = React.useState<BorrowingTabKey>('borrowing');
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [dismissedNotificationIds, setDismissedNotificationIds] = React.useState<Set<string>>(new Set());
  const { identity } = useAppSession();
  const { theme } = useAppTheme();
  const { openProfileSheet } = useProfileSheet();
  const { onScroll, showHeaderChrome } = useHeaderChromeVisibility();
  const isIos = Platform.OS === 'ios';

  const borrowing = useBorrowingOrders();
  const actions = useBorrowingActions();
  const notificationsQuery = useNotificationsQuery();
  const timeline = useActivityTimeline({
    allActiveOrders: borrowing.allActiveOrders,
    canonicalOrders: borrowing.canonicalOrders,
  });
  const previousNotificationIds = React.useRef<Set<string>>(new Set());
  const hasHydratedNotifications = React.useRef(false);
  const hasHydratedDismissedNotifications = React.useRef(false);
  const notificationDismissProgress = React.useRef<Record<string, Animated.Value>>({});
  const notificationStorageKey = React.useMemo(
    () => getDismissedNotificationsStorageKey(identity?.accountId),
    [identity?.accountId]
  );

  const borrowingError = borrowing.borrowingError;
  const notifications = notificationsQuery.data ?? [];
  const visibleNotifications = React.useMemo(
    () => notifications.filter((item) => !dismissedNotificationIds.has(item.id)),
    [dismissedNotificationIds, notifications]
  );
  const isDynamicLoading =
    timeline.isDynamicLoading || (!notificationsQuery.data && Boolean(notificationsQuery.isFetching));

  const getNotificationPresentation = React.useCallback(
    (kind: NotificationItem['kind']) => {
      if (kind === 'delivery') {
        return {
          accentColor: theme.colors.primaryStrong,
          accentSoft: theme.colors.primarySoft,
          icon: 'truck' as AppIconName,
          mutedColor: theme.colors.primaryStrong,
        };
      }

      if (kind === 'borrowing') {
        return {
          accentColor: theme.colors.warning,
          accentSoft: theme.colors.warningSoft,
          icon: 'borrowing' as AppIconName,
          mutedColor: theme.colors.warning,
        };
      }

      if (kind === 'achievement') {
        return {
          accentColor: theme.colors.success,
          accentSoft: theme.colors.successSoft,
          icon: 'spark' as AppIconName,
          mutedColor: theme.colors.success,
        };
      }

      return {
        accentColor: theme.colors.text,
        accentSoft: theme.colors.surfaceMuted,
        icon: 'bell' as AppIconName,
        mutedColor: theme.colors.textSoft,
      };
    },
    [theme]
  );

  const getNotificationProgress = React.useCallback((id: string) => {
    if (!notificationDismissProgress.current[id]) {
      notificationDismissProgress.current[id] = new Animated.Value(1);
    }

    return notificationDismissProgress.current[id];
  }, []);

  const handleDismissNotification = React.useCallback(
    (id: string) => {
      const progress = getNotificationProgress(id);

      Animated.timing(progress, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) {
          return;
        }

        if (Platform.OS !== 'web') {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }

        setDismissedNotificationIds((prev) => {
          if (prev.has(id)) {
            return prev;
          }

          const next = new Set(prev);
          next.add(id);
          void writeDismissedNotificationIds(notificationStorageKey, next);
          return next;
        });
      });
    },
    [getNotificationProgress, notificationStorageKey]
  );

  React.useEffect(() => {
    let isCancelled = false;
    hasHydratedDismissedNotifications.current = false;
    setDismissedNotificationIds(new Set());

    void readDismissedNotificationIds(notificationStorageKey).then((ids) => {
      if (isCancelled) {
        return;
      }

      setDismissedNotificationIds((prev) => new Set([...prev, ...ids]));
      hasHydratedDismissedNotifications.current = true;
    });

    return () => {
      isCancelled = true;
    };
  }, [notificationStorageKey]);

  React.useEffect(() => {
    if (!hasHydratedDismissedNotifications.current) {
      return;
    }

    void writeDismissedNotificationIds(notificationStorageKey, dismissedNotificationIds);
  }, [dismissedNotificationIds, notificationStorageKey]);

  React.useEffect(() => {
    if (!notificationsQuery.data?.length) {
      return;
    }

    const nextIds = new Set(notificationsQuery.data.map((item) => item.id));
    if (!hasHydratedNotifications.current) {
      previousNotificationIds.current = nextIds;
      hasHydratedNotifications.current = true;
      return;
    }

    const newCount = notificationsQuery.data.filter((item) => !previousNotificationIds.current.has(item.id)).length;
    previousNotificationIds.current = nextIds;

    if (newCount > 0) {
      toast.success(`收到 ${newCount} 条新提醒`);
    }
  }, [notificationsQuery.data]);

  React.useEffect(() => {
    const liveIds = new Set(notifications.map((item) => item.id));

    setDismissedNotificationIds((prev) => {
      let changed = false;
      const next = new Set<string>();

      prev.forEach((id) => {
        if (liveIds.has(id)) {
          next.add(id);
          return;
        }

        changed = true;
        delete notificationDismissProgress.current[id];
      });

      return changed ? next : prev;
    });

    notifications.forEach((item) => {
      if (!dismissedNotificationIds.has(item.id) && notificationDismissProgress.current[item.id]) {
        notificationDismissProgress.current[item.id].setValue(1);
      }
    });
  }, [dismissedNotificationIds, notifications]);

  return (
    <>
      {isIos ? (
        <Stack.Screen
          options={{
            title: '',
            unstable_headerLeftItems: () =>
              showHeaderChrome
                ? [
                    {
                      element: (
                        <View testID="borrowing-header-inline-title-slot">
                          <ToolbarHeaderRow title="借阅" />
                        </View>
                      ),
                      hidesSharedBackground: true,
                      type: 'custom' as const,
                    },
                  ]
                : [],
            unstable_headerRightItems: () =>
              showHeaderChrome
                ? [
                    {
                      element: (
                        <View testID="borrowing-header-profile-slot">
                          <ToolbarProfileAction onPress={openProfileSheet} />
                        </View>
                      ),
                      hidesSharedBackground: true,
                      type: 'custom' as const,
                    },
                  ]
                : [],
          }}
        />
      ) : (
        <Stack.Screen
          options={{
            headerRight: () =>
              showHeaderChrome ? <ProfileSheetTriggerButton onPress={openProfileSheet} /> : null,
            title: showHeaderChrome ? '借阅' : '',
          }}
        />
      )}
      <PageShell insetBottom={112} mode="task" onScroll={onScroll}>
        {borrowingError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(borrowingError, '借阅状态暂时同步失败，请确认相关接口可访问。')}
            title="借阅联调失败"
            tone="danger"
          />
        ) : null}

        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              flexDirection: 'row',
              gap: theme.spacing.sm,
              padding: 6,
            }}>
            {borrowingTabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="button"
                  onPress={() => setActiveTab(tab.key)}
                  style={({ pressed }) => ({
                    flex: 1,
                    opacity: pressed ? 0.92 : 1,
                  })}
                  testID={tab.key === 'activity' ? 'borrowing-tab-dynamic' : `borrowing-tab-${tab.key}`}>
                  <View
                    style={{
                      backgroundColor: active ? theme.colors.primarySoft : 'transparent',
                      borderColor: active ? theme.colors.primaryStrong : 'transparent',
                      borderRadius: theme.radii.md,
                      borderWidth: active ? 1 : 0,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 10,
                    }}>
                    <Text
                      style={{
                        color: active ? theme.colors.primaryStrong : theme.colors.textMuted,
                        ...theme.typography.medium,
                        fontSize: 14,
                        textAlign: 'center',
                      }}>
                      {tab.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeTab === 'borrowing' ? (
          <>
            {borrowing.isBorrowingLoading ? (
              <BorrowingSummarySkeleton />
            ) : (
              <BorrowingSummary
                dueSoonCount={borrowing.dueSoonOrders.length}
                headline="借阅任务中心"
                renewableCount={borrowing.renewableOrders.length}
                totalCount={borrowing.allActiveOrders.length}
              />
            )}

            <View style={{ gap: theme.spacing.md }}>
              <SectionTitle title="订单筛选" />
              <ScrollView
                contentContainerStyle={{
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  paddingRight: theme.spacing.xs,
                }}
                directionalLockEnabled
                horizontal
                nestedScrollEnabled
                overScrollMode="never"
                showsHorizontalScrollIndicator={false}
                testID="borrowing-filter-strip">
                {statusFilters.map((item) => {
                  const active = borrowing.statusFilter === item.value;
                  const palette = resolveBorrowingFilterPalette(theme, item.value);

                  return (
                    <Pressable
                      key={item.label}
                      accessibilityRole="button"
                      onPress={() => borrowing.setStatusFilter(item.value)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                      testID={`borrowing-filter-chip-${item.value ?? 'all'}`}>
                      <View
                        style={{
                          backgroundColor: active ? theme.colors.primarySoft : 'transparent',
                          borderRadius: theme.radii.md + 2,
                          padding: active ? 2 : 0,
                        }}
                        testID={`borrowing-filter-chip-${item.value ?? 'all'}-shell`}>
                        <View
                          style={{
                            backgroundColor: palette.backgroundColor,
                            borderColor: active ? theme.colors.primaryStrong : theme.colors.borderStrong,
                            borderRadius: theme.radii.md,
                            borderWidth: active ? 1.5 : 1,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                          }}
                          testID={`borrowing-filter-chip-${item.value ?? 'all'}-surface`}>
                          <Text
                            style={{
                              color: palette.color,
                              ...theme.typography.medium,
                              fontSize: 13,
                            }}
                            testID={`borrowing-filter-chip-${item.value ?? 'all'}-label`}>
                            {item.label}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={{ gap: theme.spacing.lg }}>
              <SectionTitle title="我的借阅" />
              <View style={{ gap: theme.spacing.lg }}>
                {borrowing.isBorrowingLoading && borrowing.visibleOrders.length === 0
                  ? Array.from({ length: 2 }, (_, index) => (
                      <BorrowingCardSkeleton key={`borrowing-list-skeleton-${index}`} />
                    ))
                  : borrowing.visibleOrders.map((item) => (
                      <BorrowingCard
                        key={item.id}
                        actionLabel={item.renewable ? '立即续借' : item.returnable ? '发起归还请求' : '查看详情'}
                        author={item.book.author}
                        coverTone={item.book.coverTone}
                        dueDate={item.dueDateLabel}
                        note={item.note}
                        onPress={() => actions.handleCardAction(item)}
                        status={item.status}
                        title={item.book.title}
                      />
                    ))}
                {borrowing.visibleOrders.length === 0 && !borrowingError && !borrowing.isBorrowingLoading ? (
                  <StateMessageCard
                    description="去找书页看看当前可借的书，开始下一次借阅。"
                    title="当前没有符合筛选条件的借阅"
                  />
                ) : null}
              </View>
            </View>

            <View
              style={{
                paddingTop: theme.spacing.sm,
              }}>
              <EditorialIllustration
                height={176}
                source={appArtwork.notionBorrowSuccess}
                testID="borrowing-artwork"
              />
            </View>
          </>
        ) : activeTab === 'favorites' ? (
          <FavoritesTabContent />
        ) : isDynamicLoading ? (
          <DynamicFeedSkeleton />
        ) : (
          <>
            <View style={{ gap: theme.spacing.lg }}>
              <SectionTitle title="提醒" />
              <View
                style={{
                  backgroundColor: theme.colors.surfaceTint,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.xl,
                  borderWidth: 1,
                  overflow: 'hidden',
                }}
                testID="notification-cart">
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.borderSoft,
                    borderBottomWidth: 1,
                    gap: theme.spacing.md,
                    padding: theme.spacing.lg,
                  }}>
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: theme.spacing.md,
                      justifyContent: 'space-between',
                    }}>
                    <View style={{ alignItems: 'center', flexDirection: 'row', flex: 1, gap: theme.spacing.md }}>
                      <View
                        style={{
                          alignItems: 'center',
                          backgroundColor: theme.colors.primarySoft,
                          borderRadius: theme.radii.lg,
                          height: 44,
                          justifyContent: 'center',
                          width: 44,
                        }}>
                        <AppIcon color={theme.colors.primaryStrong} name="package" size={18} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 16 }}>
                          待处理提醒
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{
                        backgroundColor: theme.colors.primarySoft,
                        borderColor: theme.colors.primaryStrong,
                        borderRadius: theme.radii.pill,
                        borderWidth: 1,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}>
                      <Text
                        style={{
                          color: theme.colors.primaryStrong,
                          ...theme.typography.medium,
                          fontSize: 12,
                        }}>
                        {`${visibleNotifications.length} 条待处理`}
                      </Text>
                    </View>
                  </View>
                </View>

                {visibleNotifications.length === 0 ? (
                    <View
                      style={{
                        alignItems: 'center',
                        paddingHorizontal: theme.spacing.lg,
                        paddingVertical: theme.spacing.xl + theme.spacing.sm,
                      }}>
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderStrong,
                        borderRadius: theme.radii.lg,
                        borderWidth: 1,
                        height: 54,
                        justifyContent: 'center',
                        width: 54,
                      }}>
                      <AppIcon color={theme.colors.textSoft} name="bell" size={20} />
                    </View>
                    <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 16, marginTop: theme.spacing.sm }}>
                      暂无信息
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      padding: theme.spacing.md,
                    }}>
                    {visibleNotifications.map((item, index) => {
                      const progress = getNotificationProgress(item.id);
                      const presentation = getNotificationPresentation(item.kind);

                      return (
                        <Animated.View
                          key={item.id}
                          style={{
                            marginBottom: index === visibleNotifications.length - 1 ? 0 : theme.spacing.md,
                            maxHeight: progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 176],
                            }),
                            opacity: progress,
                            overflow: 'hidden',
                            transform: [
                              {
                                translateX: progress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [88, 0],
                                }),
                              },
                              {
                                scale: progress.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.96, 1],
                                }),
                              },
                            ],
                          }}>
                          <Swipeable
                            overshootRight={false}
                            renderRightActions={() => (
                              <View
                                style={{
                                  justifyContent: 'center',
                                  paddingLeft: theme.spacing.sm,
                                }}>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => handleDismissNotification(item.id)}
                                  testID={`notification-dismiss-${item.id}`}
                                  style={({ pressed }) => ({
                                    opacity: pressed ? 0.92 : 1,
                                  })}>
                                  <View
                                    style={{
                                      alignItems: 'center',
                                      backgroundColor: theme.colors.warningSoft,
                                      borderRadius: theme.radii.lg,
                                      gap: 4,
                                      justifyContent: 'center',
                                      minHeight: 116,
                                      minWidth: 88,
                                      paddingHorizontal: theme.spacing.md,
                                    }}>
                                    <AppIcon color={theme.colors.warning} name="x" size={18} />
                                    <Text style={{ color: theme.colors.warning, ...theme.typography.semiBold, fontSize: 13 }}>
                                      清除
                                    </Text>
                                  </View>
                                </Pressable>
                              </View>
                            )}>
                            <View
                              style={{
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.borderStrong,
                                borderRadius: theme.radii.lg,
                                borderWidth: 1,
                                padding: theme.spacing.lg,
                              }}
                              testID={`notification-card-${item.id}`}>
                              <View style={{ gap: theme.spacing.sm }}>
                                <View
                                  style={{
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    gap: theme.spacing.sm,
                                    justifyContent: 'space-between',
                                  }}>
                                  <View
                                    style={{
                                      alignItems: 'center',
                                      flexDirection: 'row',
                                      flex: 1,
                                      flexWrap: 'wrap',
                                      gap: theme.spacing.sm,
                                    }}>
                                    <View
                                      style={{
                                        backgroundColor: presentation.accentSoft,
                                        borderRadius: theme.radii.pill,
                                        paddingHorizontal: 10,
                                        paddingVertical: 5,
                                      }}>
                                      <Text
                                        style={{
                                          color: presentation.mutedColor,
                                          ...theme.typography.medium,
                                          fontSize: 12,
                                        }}>
                                        {getNotificationKindLabel(item.kind)}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                                  {item.title}
                                </Text>
                                <Text
                                  style={{
                                    color: theme.colors.textMuted,
                                    ...theme.typography.body,
                                    fontSize: 13,
                                    lineHeight: 20,
                                  }}>
                                  {item.body}
                                </Text>
                              </View>
                            </View>
                          </Swipeable>
                        </Animated.View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            <View style={{ gap: theme.spacing.lg }}>
              <SectionTitle title="最近动态" />
              {timeline.activityGroups.length === 0 ? (
                <StateMessageCard
                  description="配送状态、借阅提醒、学习记录和历史借阅会同步到这里。"
                  title="最近动态会显示在这里"
                />
              ) : (
                <View style={{ gap: theme.spacing.md }} testID="borrowing-activity-timeline">
                  {timeline.activityGroups.map((group) => {
                    const expanded = expandedGroups.has(group.category);
                    const visibleItems = expanded ? group.items : group.items.slice(0, 2);
                    const hasMore = group.totalCount > 2;
                    const dotColor =
                      group.category === '配送进展'
                        ? theme.colors.primaryStrong
                        : group.category === '归还流程'
                          ? theme.colors.warning
                          : group.category === '学习记录'
                            ? theme.colors.success
                            : theme.colors.textSoft;

                    return (
                      <View
                        key={group.category}
                        style={{
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.borderStrong,
                          borderRadius: theme.radii.lg,
                          borderWidth: 1,
                          overflow: 'hidden',
                        }}>
                        <View
                          style={{
                            alignItems: 'center',
                            flexDirection: 'row',
                            gap: theme.spacing.sm,
                            paddingHorizontal: theme.spacing.lg,
                            paddingBottom: theme.spacing.md,
                            paddingTop: theme.spacing.lg,
                          }}>
                          <View style={{ backgroundColor: dotColor, borderRadius: 999, height: 8, width: 8 }} />
                          <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, flex: 1, fontSize: 14 }}>
                            {group.category}
                          </Text>
                        </View>
                        {visibleItems.map((item, index) => (
                          <View
                            key={item.id}
                            style={{
                              borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                              borderTopWidth: index === 0 ? 0 : 1,
                              flexDirection: 'row',
                              gap: theme.spacing.md,
                              paddingHorizontal: theme.spacing.lg,
                              paddingVertical: theme.spacing.md,
                            }}>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text
                                style={{
                                  color: theme.colors.text,
                                  ...theme.typography.semiBold,
                                  fontSize: 15,
                                  lineHeight: 21,
                                }}>
                                {item.title}
                              </Text>
                              <Text
                                style={{
                                  color: theme.colors.textMuted,
                                  ...theme.typography.medium,
                                  fontSize: 13,
                                  lineHeight: 18,
                                }}>
                                {item.description}
                              </Text>
                            </View>
                            {item.actionLabel && item.onPress ? (
                              <View
                                style={{
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                <PillButton
                                  href={undefined}
                                  label={item.actionLabel}
                                  onPress={item.onPress}
                                  variant="soft"
                                />
                              </View>
                            ) : null}
                          </View>
                        ))}
                        {hasMore ? (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                              setExpandedGroups((prev) => {
                                const next = new Set(prev);
                                if (next.has(group.category)) {
                                  next.delete(group.category);
                                } else {
                                  next.add(group.category);
                                }
                                return next;
                              });
                            }}
                            style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, paddingTop: theme.spacing.sm }}>
                            <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.medium, fontSize: 13 }}>
                              {expanded ? '收起' : `查看全部 ${group.totalCount} 条`}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </PageShell>
    </>
  );
}
