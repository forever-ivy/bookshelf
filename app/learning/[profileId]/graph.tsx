import { BookKey, Network } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useQuery } from '@tanstack/react-query';

import { LearningWorkspaceScaffold } from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLearningGraph } from '@/lib/api/learning';

type IconComponent = React.ComponentType<Record<string, unknown>>;

const BookKeyIcon = BookKey as IconComponent;
const NetworkIcon = Network as IconComponent;

export default function LearningWorkspaceGraphScreen() {
  const { theme } = useAppTheme();
  const { token } = useAppSession();
  const { profile, sourceCards } = useLearningWorkspaceScreen();

  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['learning', 'graph', profile?.id],
    queryFn: () => getLearningGraph(profile!.id, token),
    enabled: !!profile?.id && !!token,
  });

  return (
    <LearningWorkspaceScaffold mode="graph">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <NetworkIcon color={theme.colors.primaryStrong} size={18} />
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text, fontFamily: theme.typography.semiBold.fontFamily },
              ]}>
              概念分布图谱
            </Text>
          </View>
          <View
            style={[
              styles.graphContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <View
              style={[
                styles.node,
                styles.nodeCenter,
                {
                  backgroundColor: theme.colors.primaryStrong,
                  shadowColor: theme.colors.primary,
                },
              ]}
            />
            <View
              style={[
                styles.node,
                styles.node1,
                {
                  backgroundColor: theme.colors.primarySoft,
                  borderColor: theme.colors.borderStrong,
                  borderWidth: 1,
                },
              ]}
            />
            <View
              style={[
                styles.node,
                styles.node2,
                {
                  backgroundColor: theme.colors.accentMint,
                  borderColor: theme.colors.borderStrong,
                  borderWidth: 1,
                },
              ]}
            />
            <View
              style={[
                styles.node,
                styles.node3,
                {
                  backgroundColor: theme.colors.accentLavender,
                  borderColor: theme.colors.borderStrong,
                  borderWidth: 1,
                },
              ]}
            />

            <View style={[styles.line, styles.line1, { backgroundColor: theme.colors.borderSoft }]} />
            <View style={[styles.line, styles.line2, { backgroundColor: theme.colors.borderSoft }]} />
            <View style={[styles.line, styles.line3, { backgroundColor: theme.colors.borderSoft }]} />

            <Text
              style={[
                styles.graphLabel,
                { color: theme.colors.textSoft, fontFamily: theme.typography.body.fontFamily },
              ]}>
              {graphLoading
                ? '交互式图谱生成中...'
                : graphData
                  ? `已渲染后端图谱数据 (${graphData.nodes?.length ?? 0} 个节点)`
                  : '交互式图谱生成中'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BookKeyIcon color={theme.colors.primaryStrong} size={18} />
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text, fontFamily: theme.typography.semiBold.fontFamily },
              ]}>
              来源依据
            </Text>
          </View>

          <View style={styles.sourcesList}>
            {sourceCards.map((card) => (
              <View
                key={card.id}
                style={[
                  styles.sourceCard,
                  { borderBottomColor: theme.colors.borderSoft },
                ]}>
                <Text
                  style={[
                    styles.sourceMeta,
                    { color: theme.colors.textSoft, fontFamily: theme.typography.semiBold.fontFamily },
                  ]}>
                  {card.meta}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sourceTitle,
                    { color: theme.colors.text, fontFamily: theme.typography.bold.fontFamily },
                  ]}>
                  {card.title}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[
                    styles.sourceExcerpt,
                    { color: theme.colors.textMuted, fontFamily: theme.typography.body.fontFamily },
                  ]}>
                  {card.excerpt}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </LearningWorkspaceScaffold>
  );
}

const styles = StyleSheet.create({
  graphContainer: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    height: 220,
    justifyContent: 'center',
    opacity: 0.82,
    position: 'relative',
  },
  graphLabel: {
    bottom: 16,
    fontSize: 12,
    position: 'absolute',
  },
  line: {
    height: 1,
    position: 'absolute',
  },
  line1: {
    left: '35%',
    top: '30%',
    transform: [{ rotate: '45deg' }],
    width: 60,
  },
  line2: {
    left: '42%',
    top: '60%',
    transform: [{ rotate: '-30deg' }],
    width: 80,
  },
  line3: {
    left: '60%',
    top: '40%',
    transform: [{ rotate: '20deg' }],
    width: 60,
  },
  node: {
    borderRadius: 999,
    position: 'absolute',
  },
  node1: {
    height: 24,
    left: '20%',
    top: '20%',
    width: 24,
  },
  node2: {
    height: 32,
    left: '28%',
    top: '65%',
    width: 32,
  },
  node3: {
    height: 40,
    left: '70%',
    top: '35%',
    width: 40,
  },
  nodeCenter: {
    height: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    width: 16,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
  },
  sourceCard: {
    borderBottomWidth: 1,
    paddingVertical: 16,
  },
  sourceExcerpt: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  sourceMeta: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sourceTitle: {
    fontSize: 17,
  },
  sourcesList: {
    flexDirection: 'column',
  },
});
