import React from 'react';
import { Text, View } from 'react-native';

import { MarkerHighlightText } from '@/components/base/marker-highlight-text';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SectionTitle({
  description,
  descriptionHighlight,
  eyebrow,
  title,
}: {
  description?: string;
  descriptionHighlight?: string;
  eyebrow?: string;
  title: string;
}) {
  const { theme } = useAppTheme();
  const descriptionTextStyle = {
    color: theme.colors.textMuted,
    ...theme.typography.body,
    fontSize: 13,
    lineHeight: 19,
  } as const;

  return (
    <View style={{ gap: 4 }}>
      {eyebrow ? (
        <Text
          style={{
            color: theme.colors.primaryStrong,
            ...theme.typography.medium,
            fontSize: 11,
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}>
          {eyebrow}
        </Text>
      ) : null}
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.heading,
          fontSize: 20,
          letterSpacing: -0.2,
        }}>
        {title}
      </Text>
      {description ? (
        descriptionHighlight ? (
          <MarkerHighlightText
            highlight={descriptionHighlight}
            text={description}
            textStyle={descriptionTextStyle}
          />
        ) : (
          <Text style={descriptionTextStyle}>{description}</Text>
        )
      ) : null}
    </View>
  );
}
