import { usePathname } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { appTabs } from '@/lib/app/navigation';

export default function AppTabsWebLayout() {
  const { theme } = useBookleafTheme();
  const pathname = usePathname();

  return (
    <Tabs>
      <TabSlot />
      <TabList
        style={{
          backgroundColor: theme.nav.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: 12,
          justifyContent: 'space-around',
          paddingBottom: 18,
          paddingHorizontal: 16,
          paddingTop: 12,
        }}>
        {appTabs.map((tab) => (
          <TabTrigger
            href={tab.href}
            key={tab.key}
            name={tab.key}
            style={{
              alignItems: 'center',
              borderRadius: 999,
              flex: 1,
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 10,
            }}>
            <WebTabTriggerContent
              focused={pathname === tab.href || pathname.startsWith(`${tab.href}/`)}
              icon={tab.icon}
              label={tab.label}
            />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

type WebTabTriggerContentProps = {
  focused: boolean;
  icon: (typeof appTabs)[number]['icon'];
  label: string;
};

function WebTabTriggerContent({
  focused,
  icon,
  label,
}: WebTabTriggerContentProps) {
  const { theme } = useBookleafTheme();

  return (
    <View style={{ alignItems: 'center', gap: 10 }}>
      <AppIcon
        color={focused ? theme.nav.iconSelected : theme.nav.iconDefault}
        name={icon}
        size={20}
        strokeWidth={focused ? 2.3 : 1.9}
      />
      <Text
        selectable
        style={{
          color: focused ? theme.nav.labelSelected : theme.nav.labelDefault,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: 12,
          fontWeight: focused ? '700' : '500',
        }}>
        {label}
      </Text>
    </View>
  );
}
