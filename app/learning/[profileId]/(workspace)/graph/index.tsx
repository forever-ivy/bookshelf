import { Stack } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { LearningWorkspaceScaffold } from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { LearningGraphWebView } from '@/components/learning/learning-graph-webview';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLearningGraph } from '@/lib/api/learning';
import type { LearningGraphHydratePayload } from '@/lib/learning/graph-bridge';
import {
  buildLearningGraphViewModel,
  getLearningGraphSelection,
} from '@/lib/learning/graph';

const GRAPH_RUNTIME_CONFIG = {
  conceptLabelZoom: 1.8,
  cooldownTicks: 120,
  linkDistances: {
    DERIVED_FROM: 88,
    EVIDENCE_FOR: 76,
    MENTIONS: 64,
    NEXT_STEP: 112,
    PREREQUISITE_OF: 112,
    RELATED_TO: 72,
    TEACHES: 96,
    TESTS: 90,
  },
  nodeSizes: {
    Book: 14,
    Concept: 6,
    Fragment: 3,
    LessonStep: 9,
    SourceAsset: 10,
  },
  velocityDecay: 0.25,
} as const;

export default function LearningWorkspaceGraphScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAppSession();
  const { profile, sourceSummary } = useLearningWorkspaceScreen();
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [hydrateToken, setHydrateToken] = React.useState(0);
  const topChromePadding = insets.top + theme.spacing.xxl;

  const { data: graph, error, isLoading } = useQuery({
    queryKey: ['learning', 'graph', profile?.id],
    queryFn: () => getLearningGraph(profile!.id, token),
    enabled: !!profile?.id && !!token,
  });

  const graphViewModel = React.useMemo(
    () => (graph ? buildLearningGraphViewModel(graph) : null),
    [graph]
  );
  const selection = React.useMemo(
    () => getLearningGraphSelection(graphViewModel ?? null, selectedNodeId),
    [graphViewModel, selectedNodeId]
  );

  const hydratePayload = React.useMemo<LearningGraphHydratePayload | null>(() => {
    if (!graphViewModel) {
      return null;
    }

    return {
      config: GRAPH_RUNTIME_CONFIG,
      edgeKeysByNodeId: graphViewModel.edgeKeysByNodeId,
      graph: graphViewModel.graph,
      linkedNodeIdsByNodeId: graphViewModel.linkedNodeIdsByNodeId,
      selectedNodeId: null,
      theme: {
        background: theme.colors.backgroundWorkspace,
        borderSoft: theme.colors.borderSoft,
        edge: 'rgba(102, 98, 88, 0.28)',
        fragment: theme.colors.textSoft,
        primary: theme.colors.primaryStrong,
        source: theme.colors.success,
        step: theme.colors.warning,
        surface: theme.colors.surface,
        text: theme.colors.text,
        textSoft: theme.colors.textSoft,
      },
    };
  }, [graphViewModel, theme.colors]);

  const nodeCount = graphViewModel?.graph.nodes.length ?? 0;
  const edgeCount = graphViewModel?.graph.edges.length ?? 0;
  const showWebFallback = Platform.OS === 'web';
  const isEmpty = !isLoading && !error && nodeCount === 0;

  const handleResetView = React.useCallback(() => {
    setSelectedNodeId(null);
    setHydrateToken((value) => value + 1);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShadowVisible: false, title: '' }} />
      <LearningWorkspaceScaffold showHeader={false} subtitle="知识图谱">
        <View
          style={[
            styles.page,
            {
              backgroundColor: theme.colors.backgroundWorkspace,
              paddingTop: topChromePadding,
            },
          ]}>
          <View style={styles.heroBlock}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 34,
                letterSpacing: -1,
                lineHeight: 40,
              }}>
              概念图谱
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              把资料、片段、概念和导学步骤放进同一张图里，方便从结构和依据两个角度回看。
            </Text>
          </View>

          <View
            style={[
              styles.graphCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
              },
            ]}>
            <View style={styles.graphCardHeader}>
              <View style={styles.graphMetaRow}>
                <Text
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.semiBold,
                    fontSize: 12,
                  }}>
                  {graphViewModel?.graph.provider ?? 'fallback'}
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 12,
                  }}>
                  {nodeCount} 个节点
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 12,
                  }}>
                  {edgeCount} 条连线
                </Text>
              </View>

              {!showWebFallback && !isEmpty ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleResetView}
                  style={({ pressed }) => [
                    styles.resetButton,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.borderSoft,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.medium,
                      fontSize: 12,
                    }}>
                    重置视图
                  </Text>
                </Pressable>
              ) : null}
            </View>

            <View
              style={[
                styles.graphStage,
                {
                  backgroundColor: theme.colors.backgroundWorkspace,
                  borderColor: theme.colors.borderSoft,
                },
              ]}>
              {showWebFallback ? (
                <GraphEmptyState
                  body={sourceSummary}
                  title="图谱仅支持 iOS/Android"
                />
              ) : isLoading ? (
                <GraphEmptyState
                  body="图谱数据正在从后端工作区加载。"
                  title="正在加载图谱数据"
                />
              ) : error ? (
                <GraphEmptyState
                  body={sourceSummary}
                  title="图谱加载失败"
                />
              ) : isEmpty || !hydratePayload ? (
                <GraphEmptyState
                  body={sourceSummary}
                  title="还没有可展示的图谱数据"
                />
              ) : (
                <LearningGraphWebView
                  hydratePayload={hydratePayload}
                  hydrateToken={hydrateToken}
                  onBackgroundTap={() => setSelectedNodeId(null)}
                  onNodeTap={(nodeId) => setSelectedNodeId(nodeId)}
                  selectedNodeId={selectedNodeId}
                />
              )}
            </View>
          </View>

          <View
            style={[
              styles.detailsCard,
              {
                backgroundColor: theme.colors.surfaceTint,
                borderColor: theme.colors.borderSoft,
              },
            ]}>
            <View style={styles.detailsSection}>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.semiBold,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}>
                当前选中
              </Text>

              {selection ? (
                <>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.heading,
                      fontSize: 26,
                      letterSpacing: -0.6,
                      lineHeight: 31,
                    }}>
                    {selection.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 14,
                      lineHeight: 21,
                    }}>
                    {selection.typeLabel}
                  </Text>
                  {selection.description ? (
                    <Text
                      style={{
                        color: theme.colors.text,
                        ...theme.typography.body,
                        fontSize: 14,
                        lineHeight: 21,
                      }}>
                      {selection.description}
                    </Text>
                  ) : null}
                  <View style={styles.metadataList}>
                    {selection.metadata.map((item) => (
                      <Text
                        key={item}
                        style={{
                          color: theme.colors.textMuted,
                          ...theme.typography.body,
                          fontSize: 13,
                          lineHeight: 19,
                        }}>
                        {item}
                      </Text>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.heading,
                      fontSize: 24,
                      letterSpacing: -0.5,
                      lineHeight: 29,
                    }}>
                    未选中节点
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 14,
                      lineHeight: 21,
                    }}>
                    点击图谱中的节点查看细节与相关来源。
                  </Text>
                </>
              )}
            </View>

            <View style={styles.detailsSection}>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.semiBold,
                  fontSize: 11,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}>
                相关来源
              </Text>

              {selection?.relatedFragments.length ? (
                <View style={styles.relatedList}>
                  {selection.relatedFragments.slice(0, 5).map((fragment) => (
                    <View
                      key={fragment.id}
                      style={[
                        styles.relatedItem,
                        { borderColor: theme.colors.borderSoft },
                      ]}>
                      <Text
                        style={{
                          color: theme.colors.textSoft,
                          ...theme.typography.medium,
                          fontSize: 12,
                          marginBottom: 4,
                        }}>
                        {typeof fragment.chapterLabel === 'string'
                          ? fragment.chapterLabel
                          : `片段 ${Number(fragment.chunkIndex ?? 0) + 1}`}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{
                          color: theme.colors.text,
                          ...theme.typography.semiBold,
                          fontSize: 14,
                          lineHeight: 20,
                        }}>
                        {typeof fragment.semanticSummary === 'string'
                          ? fragment.semanticSummary
                          : fragment.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 14,
                    lineHeight: 21,
                  }}>
                  {isEmpty || !!error || showWebFallback
                    ? '等待图谱数据可用后再查看相关来源。'
                    : sourceSummary}
                </Text>
              )}
            </View>
          </View>
        </View>
      </LearningWorkspaceScaffold>
    </>
  );
}

function GraphEmptyState({ body, title }: { body: string; title: string }) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.emptyState}>
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.heading,
          fontSize: 22,
          letterSpacing: -0.4,
          lineHeight: 28,
          textAlign: 'center',
        }}>
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 14,
          lineHeight: 21,
          textAlign: 'center',
        }}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsCard: {
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 20,
  },
  detailsSection: {
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  graphCard: {
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    gap: 14,
    minHeight: 280,
    padding: 18,
  },
  graphCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  graphMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  graphStage: {
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 240,
    overflow: 'hidden',
  },
  heroBlock: {
    gap: 8,
  },
  metadataList: {
    gap: 4,
  },
  page: {
    flex: 1,
    gap: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  relatedItem: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  relatedList: {
    gap: 10,
  },
  resetButton: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
