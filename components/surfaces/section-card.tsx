import React from 'react';
import { Text, View } from 'react-native';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type SectionCardProps = {
  children: React.ReactNode;
  description?: string;
  title?: string;
};

export function SectionCard({ children, description, title }: SectionCardProps) {
  const { theme } = useBookleafTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderCurve: 'continuous',
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        shadowColor: '#0F172A',
        shadowOffset: { height: 12, width: 0 },
        shadowOpacity: theme.isDark ? 0.3 : 0.045,
        shadowRadius: 36,
        gap: 16,
        padding: 24,
      }}>
      <View style={{ gap: 16 }}>
        {title ? (
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 28,
              }}>
              {title}
            </Text>
            {description ? (
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 15,
                  lineHeight: 22,
                }}>
                {description}
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </View>
    </View>
  );
}
