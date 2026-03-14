import { Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { CabinetStatusSummary } from '@/lib/api/contracts/types';

type CabinetStatusCardProps = {
  summary: CabinetStatusSummary;
};

export function CabinetStatusCard({ summary }: CabinetStatusCardProps) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.78)',
        borderColor: bookleafTheme.colors.cardBorder,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.xl,
        borderWidth: 1,
        boxShadow: bookleafTheme.shadows.card,
        gap: 18,
        padding: 24,
      }}>
      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: '#D7F5E1',
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.pill,
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
        <AppIcon color={bookleafTheme.colors.accentGreen} name="cabinet" size={16} />
        <Text
          selectable
          style={{
            color: '#0F5132',
            ...bookleafTheme.typography.semiBold,
            fontSize: 12,
          }}>
          已连接
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.heading,
            fontSize: 28,
          }}>
          {summary.connectedLabel}
        </Text>
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.textMuted,
            ...bookleafTheme.typography.medium,
            fontSize: 15,
          }}>
          {summary.locationLabel} · {summary.totalBooks} 本书
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {[
          { label: '已占格口', value: String(summary.usedCompartments) },
          { label: '空闲格口', value: String(summary.availableCompartments) },
          { label: '总容量', value: String(summary.totalCompartments) },
        ].map((item) => (
          <View
            key={item.label}
            style={{
              backgroundColor: bookleafTheme.colors.surfaceMuted,
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.lg,
              flex: 1,
              gap: 4,
              padding: 14,
            }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                ...bookleafTheme.typography.bold,
                fontSize: 18,
                fontVariant: ['tabular-nums'],
              }}>
              {item.value}
            </Text>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.textMuted,
                ...bookleafTheme.typography.body,
                fontSize: 12,
              }}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
