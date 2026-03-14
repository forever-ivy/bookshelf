import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { getNativeTabIconProps } from '@/components/base/app-icon';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { appTabs } from '@/lib/app/navigation';

export default function AppTabsLayout() {
  const titlePositionAdjustment = {
    vertical: 3,
  } as const;

  const nativeTitleSpacingAppearance = {
    compactInline: {
      focused: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
      normal: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
      selected: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
    },
    inline: {
      focused: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
      normal: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
      selected: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
    },
    stacked: {
      focused: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
      normal: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
      selected: {
        tabBarItemTitlePositionAdjustment: titlePositionAdjustment,
      },
    },
  } as const;

  return (
    <NativeTabs
      backgroundColor={bookleafTheme.colors.surface}
      blurEffect="systemMaterial"
      iconColor={{
        default: bookleafTheme.colors.textSoft,
        selected: bookleafTheme.colors.primaryStrong,
      }}
      labelStyle={{
        default: {
          color: bookleafTheme.colors.textSoft,
          fontFamily: bookleafTheme.typography.medium.fontFamily,
          fontSize: 12,
          fontWeight: '500',
        },
        selected: {
          color: bookleafTheme.colors.primaryStrong,
          fontFamily: bookleafTheme.typography.bold.fontFamily,
          fontSize: 12,
          fontWeight: '700',
        },
      }}
      minimizeBehavior="onScrollDown"
      tintColor={bookleafTheme.colors.primaryStrong}>
      {appTabs.map((tab) => (
        <NativeTabs.Trigger
          key={tab.key}
          name={tab.key}
          unstable_nativeProps={{
            scrollEdgeAppearance: nativeTitleSpacingAppearance,
            standardAppearance: nativeTitleSpacingAppearance,
          }}>
          <NativeTabs.Trigger.Icon {...getNativeTabIconProps(tab.icon)} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
