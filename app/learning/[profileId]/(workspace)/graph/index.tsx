import { Stack } from 'expo-router';
import React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  Host as ComposeHost,
  RNHostView as ComposeRNHostView,
  ModalBottomSheet,
} from '@expo/ui/jetpack-compose';
import {
  BottomSheet,
  Group,
  Host as SwiftHost,
  RNHostView as SwiftRNHostView,
} from '@expo/ui/swift-ui';
import {
  interactiveDismissDisabled,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

import { GlassSurface } from '@/components/base/glass-surface';
import { LearningGraphWebView } from '@/components/learning/learning-graph-webview';
import { LearningRichText } from '@/components/learning/learning-rich-text';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import {
  LearningWorkspaceScaffold,
} from '@/components/learning/learning-workspace-scaffold';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLearningGraph } from '@/lib/api/learning';
import {
  sanitizeLearningRichTextForDisplay,
  sanitizeLearningTextForDisplay,
} from '@/lib/learning/text-formatting';
import { summarizeLearningMindMapText } from '@/lib/learning/graph-runtime-2d';
import {
  buildLearningGraphSelectionPresentation,
  buildLearningGraphViewModel,
  buildLearningMindMapGraphLens,
  getLearningGraphSelection,
  type LearningGraph,
  type LearningGraphLens,
  type LearningGraphNode,
} from '@/lib/learning/graph';
import type { LearningGraphHydratePayload } from '@/lib/learning/graph-bridge';
import { buildLearningGraphRuntimeTheme } from '@/lib/learning/graph-theme';

const GRAPH_RUNTIME_CONFIG = {
  cameraFocusDistanceByNodeType: {
    Book: 380,
    Claim: 220,
    Concept: 250,
    Default: 280,
    Definition: 230,
    Formula: 210,
    Fragment: 200,
    LessonStep: 260,
    Method: 235,
    Section: 310,
    SourceAsset: 300,
    Theorem: 240,
  },
  cameraFocusDurationMs: 1400,
  controlType: 'orbit',
  cooldownTicks: 90,
  linkDistances: {
    ABOUT: 68,
    CONTAINS: 92,
    DEFINES: 72,
    DERIVED_FROM: 88,
    EVIDENCE_FOR: 76,
    MENTIONS: 64,
    MINDMAP_CHILD: 118,
    NEXT_STEP: 112,
    PREREQUISITE_OF: 112,
    PROVES: 78,
    RELATED_TO: 72,
    SUPPORTS: 78,
    TEACHES: 96,
    TESTS: 90,
    USES: 74,
  },
  nodeSizes: {
    Book: 14,
    Claim: 5,
    Concept: 6,
    Definition: 6,
    Formula: 5,
    Fragment: 3,
    LessonStep: 9,
    Method: 6,
    Section: 8,
    SourceAsset: 10,
    Theorem: 6,
  },
  velocityDecay: 0.32,
} as const;

export default function LearningWorkspaceGraphScreen() {
  const { theme } = useAppTheme();
  const { token } = useAppSession();
  const { profile, sourceSummary } = useLearningWorkspaceScreen();
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const hydrateToken = 0;

  const { data: graph, error, isLoading } = useQuery({
    queryKey: ['learning', 'graph', profile?.id],
    queryFn: () => getLearningGraph(profile!.id, token),
    enabled: !!profile?.id && !!token,
  });

  const fullGraphViewModel = React.useMemo(
    () => (graph ? buildLearningGraphViewModel(graph) : null),
    [graph]
  );
  const graphLens = React.useMemo<LearningGraphLens | null>(() => {
    if (!fullGraphViewModel) {
      return null;
    }

    return buildLearningMindMapGraphLens(fullGraphViewModel);
  }, [fullGraphViewModel]);
  const graphViewModel = graphLens?.viewModel ?? null;
  const nodeCount = graphViewModel?.graph.nodes.length ?? 0;
  const showWebFallback = Platform.OS === 'web';
  const isEmpty = !isLoading && !error && nodeCount === 0;
  const selection = React.useMemo(
    () => getLearningGraphSelection(graphViewModel ?? null, selectedNodeId),
    [graphViewModel, selectedNodeId]
  );
  const selectionPresentation = React.useMemo(
    () =>
      selection && graphLens
        ? buildLearningGraphSelectionPresentation('mindmap', selection, graphLens)
        : null,
    [graphLens, selection]
  );
  const runtimeTheme = React.useMemo(() => buildLearningGraphRuntimeTheme(theme), [theme]);

  React.useEffect(() => {
    if (!selectedNodeId || graphViewModel?.nodeById[selectedNodeId]) {
      return;
    }

    setSelectedNodeId(null);
  }, [graphViewModel, selectedNodeId]);

  const hydratePayload = React.useMemo<LearningGraphHydratePayload | null>(() => {
    if (!graph) {
      return null;
    }

    if (!graphViewModel || !graphLens) {
      return null;
    }

    return {
      config: GRAPH_RUNTIME_CONFIG,
      edgeKeysByNodeId: graphViewModel.edgeKeysByNodeId,
      generatedNodeIds: graphLens.generatedNodeIds,
      graph: buildRuntimeGraph(graphViewModel.graph),
      guideStatusByNodeId: graphLens.guideStatusByNodeId,
      highlightedNodeIds: graphLens.highlightedNodeIds,
      linkedNodeIdsByNodeId: graphViewModel.linkedNodeIdsByNodeId,
      mode: 'mindmap',
      selectedNodeId: null,
      theme: runtimeTheme,
    };
  }, [graph, graphLens, graphViewModel, runtimeTheme]);

  return (
    <>
      <Stack.Screen options={{ headerTransparent: true, headerShadowVisible: false, title: '' }} />
      <LearningWorkspaceScaffold showHeader={false} subtitle="知识图谱">
        <View style={{ flex: 1, backgroundColor: theme.colors.backgroundWorkspace }}>
          <View style={StyleSheet.absoluteFill}>
            {showWebFallback ? (
              <GraphEmptyState body={sourceSummary} title="图谱仅支持 iOS/Android" />
            ) : isLoading ? (
              <GraphEmptyState body="图谱数据正在加载..." title="正在加载图谱" />
            ) : error ? (
              <GraphEmptyState body={sourceSummary} title="图谱加载失败" />
            ) : isEmpty || !hydratePayload ? (
              <GraphEmptyState body={sourceSummary} title="暂无可展示的图谱" />
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

          <LearningGraphSelectionSheet
            presentation={selectionPresentation}
            onDismiss={() => setSelectedNodeId(null)}
          />
        </View>
      </LearningWorkspaceScaffold>
    </>
  );
}

function buildRuntimeGraph(graph: LearningGraph): LearningGraph {
  return {
    ...graph,
    nodes: graph.nodes.map(sanitizeRuntimeGraphNode),
  };
}

function sanitizeRuntimeGraphNode(node: LearningGraphNode): LearningGraphNode {
  const sanitizedLabel = sanitizeLearningTextForDisplay(node.label ?? node.id) || String(node.id);
  const rawSummaryCandidate =
    typeof node.semanticSummary === 'string'
      ? sanitizeLearningTextForDisplay(node.semanticSummary)
      : sanitizedLabel;

  return {
    ...node,
    label: sanitizedLabel,
    semanticSummary:
      typeof node.semanticSummary === 'string'
        ? sanitizeLearningTextForDisplay(node.semanticSummary)
        : node.semanticSummary,
    summaryLabel: summarizeLearningMindMapText(rawSummaryCandidate || sanitizedLabel),
  };
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
  graphCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  modeChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  page: {
    flex: 1,
    gap: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  relatedItem: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
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

function LearningGraphSelectionSheet({
  presentation,
  onDismiss,
}: {
  presentation: any;
  onDismiss: () => void;
}) {
  if (!presentation) return null;

  if (Platform.OS === 'ios') {
    return (
      <SwiftHost style={{ position: 'absolute' }} testID="graph-selection-swift-host">
        <BottomSheet
          isPresented={!!presentation}
          onIsPresentedChange={(nextValue) => {
            if (!nextValue) onDismiss();
          }}>
          <Group
            modifiers={[
              presentationDetents(['medium']),
              presentationDragIndicator('visible'),
              interactiveDismissDisabled(false),
            ]}>
            {!!presentation ? (
              <SwiftRNHostView>
                <SelectionContent presentation={presentation} />
              </SwiftRNHostView>
            ) : (
              <View />
            )}
          </Group>
        </BottomSheet>
      </SwiftHost>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <View testID="graph-selection-compose-host">
        <ComposeHost matchContents={{ vertical: true, horizontal: false }} style={{ position: 'absolute' }}>
          {!!presentation ? (
            <ModalBottomSheet onDismissRequest={onDismiss} skipPartiallyExpanded={false}>
              <ComposeRNHostView>
                <SelectionContent presentation={presentation} />
              </ComposeRNHostView>
            </ModalBottomSheet>
          ) : null}
        </ComposeHost>
      </View>
    );
  }

  // Web fallback
  return (
    <Animated.View
      entering={FadeInUp.duration(600).springify()}
      layout={Layout.springify().damping(16).mass(0.8).stiffness(100)}
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        zIndex: 10,
      }}>
      <GlassSurface
        intensity={80}
        style={{
          borderRadius: 32,
          padding: 24,
          gap: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.5)',
        }}>
        <SelectionContent presentation={presentation} />
      </GlassSurface>
    </Animated.View>
  );
}

function SelectionContent({ presentation }: { presentation: any }) {
  const { theme } = useAppTheme();

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
      }}
      showsVerticalScrollIndicator={false}
      style={{ alignSelf: 'stretch', flex: 1 }}
      testID="learning-graph-selection-scroll">
      <View
        testID="learning-graph-selection-content"
        style={{
          alignSelf: 'stretch',
          gap: 32,
          paddingTop: Platform.OS === 'web' ? 0 : 20,
          paddingBottom: Platform.OS === 'web' ? 0 : 64,
          paddingHorizontal: Platform.OS === 'web' ? 0 : 24,
        }}>
        <View style={[styles.detailsSection, { marginTop: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={[styles.modeChip, { backgroundColor: theme.colors.primarySoft }]}>
              <GraphSheetText
                style={{
                  color: theme.colors.primaryStrong,
                  ...theme.typography.bold,
                  fontSize: 10,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}>
                {presentation.eyebrow}
              </GraphSheetText>
            </View>
            {presentation.statusLabel ? (
              <View style={[styles.modeChip, { backgroundColor: theme.colors.warningSoft }]}>
                <GraphSheetText
                  style={{
                    color: theme.colors.warningStrong,
                    ...theme.typography.bold,
                    fontSize: 10,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                  }}>
                  {presentation.statusLabel}
                </GraphSheetText>
              </View>
            ) : null}
          </View>

          <View style={{ gap: 8 }}>
            <GraphSheetText
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 28,
                letterSpacing: -0.8,
                lineHeight: 34,
              }}>
              {presentation.title}
            </GraphSheetText>
            <GraphSheetText
              style={{ color: theme.colors.textMuted, ...theme.typography.medium, fontSize: 15 }}>
              {presentation.typeLabel}
            </GraphSheetText>

            {presentation.description ? (
              <GraphDetailBody
                content={presentation.description}
                style={{
                  color: theme.colors.text,
                  ...theme.typography.body,
                  fontSize: 15,
                  lineHeight: 22,
                  marginTop: 8,
                }}
                webViewTestID="learning-graph-detail-rich-text"
              />
            ) : null}

            {presentation.metadata?.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {presentation.metadata.map((item: string) => (
                  <View
                    key={item}
                    style={[
                      styles.modeChip,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.borderSoft,
                        borderWidth: 1,
                      },
                    ]}>
                    <GraphSheetText
                      style={{
                        color: theme.colors.textMuted,
                        ...theme.typography.medium,
                        fontSize: 12,
                        lineHeight: 16,
                      }}>
                      {item}
                    </GraphSheetText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {presentation.sections?.map((section: any) => (
          <View key={section.title} style={styles.detailsSection}>
            <GraphSheetText
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.semiBold,
                fontSize: 12,
                letterSpacing: 0.8,
                marginBottom: 4,
                textTransform: 'uppercase',
              }}>
              {section.title}
            </GraphSheetText>
            <View style={styles.metadataList}>
              {section.lines.map((line: string, idx: number) => (
                <View
                  key={`${line}-${idx}`}
                  style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: theme.colors.borderStrong,
                    }}
                  />
                  <GraphDetailBody
                    content={line}
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.body,
                      flex: 1,
                      fontSize: 15,
                      lineHeight: 21,
                    }}>
                  </GraphDetailBody>
                </View>
              ))}
            </View>
          </View>
        ))}

        {presentation.relatedFragments?.length ? (
          <View style={styles.detailsSection}>
            <GraphSheetText
              style={{
                color: theme.colors.textSoft,
                ...theme.typography.semiBold,
                fontSize: 12,
                letterSpacing: 0.8,
                marginBottom: 12,
                textTransform: 'uppercase',
              }}>
              证据来源
            </GraphSheetText>
            <View style={styles.relatedList}>
              {presentation.relatedFragments.slice(0, 3).map((fragment: any) => (
                <View
                  key={fragment.id}
                  style={[
                    styles.relatedItem,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderSoft,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 2,
                    },
                  ]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginBottom: 8,
                    }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.primaryStrong,
                      }}
                    />
                    <GraphSheetText
                      style={{
                        color: theme.colors.textSoft,
                        ...theme.typography.semiBold,
                        fontSize: 11,
                        textTransform: 'uppercase',
                      }}>
                      {typeof fragment.chapterLabel === 'string'
                        ? fragment.chapterLabel
                        : `片段 ${Number(fragment.chunkIndex ?? 0) + 1}`}
                    </GraphSheetText>
                  </View>
                  <LearningRichText
                    allowFontScaling={false}
                    content={sanitizeGraphDetailText(
                      typeof fragment.semanticSummary === 'string'
                        ? fragment.semanticSummary
                        : fragment.label
                    )}
                    maxFontSizeMultiplier={1}
                    numberOfLines={4}
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.medium,
                      fontSize: 15,
                      lineHeight: 22,
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function GraphSheetText({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <Text allowFontScaling={false} maxFontSizeMultiplier={1} style={style}>
      {children}
    </Text>
  );
}

function sanitizeGraphDetailText(value: unknown) {
  return sanitizeLearningRichTextForDisplay(value);
}

function GraphDetailBody({
  content,
  style,
  webViewTestID,
}: {
  content: string;
  style?: any;
  webViewTestID?: string;
}) {
  const sanitizedContent = sanitizeGraphDetailText(content);

  return (
    <LearningRichText
      allowFontScaling={false}
      content={sanitizedContent}
      maxFontSizeMultiplier={1}
      style={style}
      webViewTestID={webViewTestID}
    />
  );
}
