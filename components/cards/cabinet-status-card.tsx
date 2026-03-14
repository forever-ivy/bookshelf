import { Text, View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import type { CabinetStatusSummary } from '@/lib/api/contracts/types';

type CabinetStatusCardProps = {
  summary: CabinetStatusSummary;
};

export function CabinetStatusCard({ summary }: CabinetStatusCardProps) {
  const { theme } = useBookleafTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.overlaySurface,
        borderColor: theme.colors.cardBorder,
        borderCurve: 'continuous',
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        boxShadow: theme.shadows.card,
        gap: 18,
        padding: 24,
      }}>
      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: theme.connectionBadge.background,
          borderCurve: 'continuous',
          borderRadius: theme.radii.pill,
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
        <AppIcon color={theme.connectionBadge.icon} name="cabinet" size={16} />
        <Text
          selectable
          style={{
            color: theme.connectionBadge.text,
            ...theme.typography.semiBold,
            fontSize: 12,
          }}>
          已连接
        </Text>
      </View>
      <View style={{ gap: 6 }}>
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 28,
          }}>
          {summary.connectedLabel}
        </Text>
        <Text
          selectable
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.medium,
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
              backgroundColor: theme.colors.surfaceMuted,
              borderCurve: 'continuous',
              borderRadius: theme.radii.lg,
              flex: 1,
              gap: 4,
              padding: 14,
            }}>
            <Text
              selectable
              style={{
                color: theme.colors.text,
                ...theme.typography.bold,
                fontSize: 18,
                fontVariant: ['tabular-nums'],
              }}>
              {item.value}
            </Text>
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
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
