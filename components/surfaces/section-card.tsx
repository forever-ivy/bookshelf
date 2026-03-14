import React from 'react';
import { Text, View } from 'react-native';
import { bookleafTheme } from '@/constants/bookleaf-theme';

type SectionCardProps = {
  children: React.ReactNode;
  description?: string;
  title?: string;
};

export function SectionCard({ children, description, title }: SectionCardProps) {
  return (
    <View
      style={{
        backgroundColor: bookleafTheme.colors.surface,
        borderColor: bookleafTheme.colors.border,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.lg,
        borderWidth: 1,
        gap: 16,
        padding: 20,
      }}>
      <View style={{ gap: 16 }}>
        {title ? (
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.text,
                ...bookleafTheme.typography.heading,
                fontSize: 28,
              }}>
              {title}
            </Text>
            {description ? (
              <Text
                selectable
                style={{
                  color: bookleafTheme.colors.textMuted,
                  ...bookleafTheme.typography.body,
                  fontSize: 14,
                  lineHeight: 20,
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
