import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { getNativeTabIconProps } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { appTabs } from '@/lib/app/navigation';

export default function AppTabsLayout() {
  const { theme } = useBookleafTheme();
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
      backgroundColor={theme.nav.background}
      blurEffect="systemMaterial"
      iconColor={{
        default: theme.nav.iconDefault,
        selected: theme.nav.iconSelected,
      }}
      labelStyle={{
        default: {
          color: theme.nav.labelDefault,
          fontFamily: theme.typography.medium.fontFamily,
          fontSize: 12,
          fontWeight: '500',
        },
        selected: {
          color: theme.nav.labelSelected,
          fontFamily: theme.typography.bold.fontFamily,
          fontSize: 12,
          fontWeight: '700',
        },
      }}
      minimizeBehavior="onScrollDown"
      tintColor={theme.nav.iconSelected}>
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
