import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { GlassPillButton } from '@/components/actions/glass-pill-button';
import { bookleafTheme } from '@/constants/bookleaf-theme';

type FlowScreenHeaderProps = {
  description: string;
  title: string;
  trailing?: React.ReactNode;
};

export function FlowScreenHeader({
  description,
  title,
  trailing,
}: FlowScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={{ gap: 16 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <GlassPillButton icon="back" onPress={() => router.back()} />
        {trailing ?? <View style={{ minWidth: 46 }} />}
      </View>
      <View style={{ gap: 8 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            fontFamily: bookleafTheme.fonts.heading,
            fontSize: 38,
            lineHeight: 44,
          }}>
          {title}
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            fontFamily: bookleafTheme.fonts.body,
            fontSize: 15,
            lineHeight: 22,
          }}>
          {description}
        </Text>
      </View>
    </View>
  );
}
