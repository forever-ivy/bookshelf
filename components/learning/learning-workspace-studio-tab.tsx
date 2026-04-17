import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  BadgeHelp,
  EllipsisVertical,
  FileImage,
  RectangleHorizontal,
} from 'lucide-react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

const EllipsisIcon = EllipsisVertical as React.ComponentType<any>;

const studioItems = [
  {
    accent: '#8A423D',
    backgroundColor: '#F9ECEA',
    icon: RectangleHorizontal,
    id: 'flashcards',
    title: '闪卡',
  },
  {
    accent: '#18698D',
    backgroundColor: '#E2F4FB',
    icon: BadgeHelp,
    id: 'quiz',
    title: '测验',
  },
  {
    accent: '#7E3C86',
    backgroundColor: '#F2E9F5',
    icon: FileImage,
    id: 'infographic',
    title: '思维导图',
  },
] as const;

export function LearningWorkspaceStudioTab({
  onGenerate,
  title = '内容工作室',
}: {
  onGenerate: (title: string) => void;
  title?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.heading,
          fontSize: 22,
        }}>
        {title}
      </Text>

      <View style={{ gap: theme.spacing.md }}>
        {studioItems.map((item) => {
          const Icon = item.icon as React.ComponentType<any>;

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => onGenerate(item.title)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.92 : 1,
              })}>
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: item.backgroundColor,
                  borderRadius: 32,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  minHeight: 92,
                  paddingHorizontal: 22,
                }}>
                <View
                  style={{ alignItems: 'center', flexDirection: 'row', gap: theme.spacing.md }}>
                  <Icon color={item.accent} size={24} strokeWidth={1.9} />
                  <Text
                    style={{
                      color: item.accent,
                      ...theme.typography.semiBold,
                      fontSize: 18,
                    }}>
                    {item.title}
                  </Text>
                </View>

                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: 'rgba(25, 23, 20, 0.08)',
                    borderRadius: theme.radii.pill,
                    height: 54,
                    justifyContent: 'center',
                    width: 54,
                  }}>
                  <EllipsisIcon color={theme.colors.text} size={18} strokeWidth={2} />
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
