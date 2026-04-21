import { Stack } from 'expo-router';
import React from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  ScrollView as SwiftScrollView,
} from '@expo/ui/swift-ui';
import {
  interactiveDismissDisabled,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeInUp, Layout, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { GlassSurface } from '@/components/base/glass-surface';
import { LearningGraphWebView } from '@/components/learning/learning-graph-webview';
import { LearningRichText } from '@/components/learning/learning-rich-text';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import {
  LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE,
  LEARNING_WORKSPACE_TOP_CHROME_OFFSET,
  LearningWorkspaceScaffold,
} from '@/components/learning/learning-workspace-scaffold';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useLearningSessionsQuery } from '@/hooks/use-library-app-data';
import { getLearningGraph } from '@/lib/api/learning';
import {
  learningTextHasMalformedMath,
  sanitizeLearningTextForDisplay,
} from '@/lib/learning/text-formatting';
import {
  buildLearningDocumentGraphViewModel,
  buildLearningExploreGraphLens,
  buildLearningGlobalGraphLens,
  buildLearningGraphSelectionPresentation,
  buildLearningGraphViewModel,
  buildLearningGuideGraphLens,
  getLearningGraphSelection,
  resolveLearningExploreGraphFocus,
  type LearningGraph,
  type LearningGraphLens,
  type LearningGraphMode,
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

const GRAPH_MODE_LABELS: Record<LearningGraphMode, string> = {
  explore: 'Explore',
  global: 'Global',
  guide: 'Guide',
};
const GRAPH_MODE_SEGMENT_HORIZONTAL_PADDING = 6;
const GRAPH_MODE_SEGMENT_MAX_WIDTH = 280;
const GRAPH_MODE_SEGMENT_MIN_HEIGHT = 38;
const GRAPH_MODE_SEGMENT_VISUAL_HEIGHT =
  GRAPH_MODE_SEGMENT_MIN_HEIGHT + GRAPH_MODE_SEGMENT_HORIZONTAL_PADDING * 2;
const GRAPH_MODE_VALUES: LearningGraphMode[] = ['global', 'explore'];
const GRAPH_MODE_OVERLAY_SIDE_INSET = 20 + LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE + 12;

export default function LearningWorkspaceGraphScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAppSession();
  const { profile, renderedMessages, sourceSummary } = useLearningWorkspaceScreen();
  const sessionsQuery = useLearningSessionsQuery();
  const [graphMode, setGraphMode] = React.useState<LearningGraphMode>('global');
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const hydrateToken = 0;

  const { data: graph, error, isLoading } = useQuery({
    queryKey: ['learning', 'graph', profile?.id],
    queryFn: () => getLearningGraph(profile!.id, token),
    enabled: !!profile?.id && !!token,
  });

  const exploreFocus = React.useMemo(
    () => resolveLearningExploreGraphFocus(renderedMessages),
    [renderedMessages]
  );
  const fullGraphViewModel = React.useMemo(
    () => (graph ? buildLearningGraphViewModel(graph) : null),
    [graph]
  );
  const documentViewModel = React.useMemo(
    () => (graph ? buildLearningDocumentGraphViewModel(graph) : null),
    [graph]
  );
  const latestGuideSession = React.useMemo(() => {
    return (sessionsQuery.data ?? [])
      .filter(
        (session) =>
          session.learningProfileId === profile?.id && session.sessionKind === 'guide'
      )
      .sort(
        (left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
      )[0] ?? null;
  }, [profile?.id, sessionsQuery.data]);
  const graphLens = React.useMemo<LearningGraphLens | null>(() => {
    if (!documentViewModel) {
      return null;
    }

    if (graphMode === 'explore') {
      return buildLearningExploreGraphLens(documentViewModel, exploreFocus);
    }

    if (graphMode === 'guide') {
      return buildLearningGuideGraphLens(documentViewModel, fullGraphViewModel ?? documentViewModel, {
        completedSteps: latestGuideSession?.completedSteps ?? [],
        currentStepIndex: latestGuideSession?.currentStepIndex ?? null,
      });
    }

    return buildLearningGlobalGraphLens(documentViewModel);
  }, [documentViewModel, exploreFocus, fullGraphViewModel, graphMode, latestGuideSession]);
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
        ? buildLearningGraphSelectionPresentation(graphMode, selection, graphLens)
        : null,
    [graphLens, graphMode, selection]
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
      mode: graphMode,
      selectedNodeId: null,
      theme: runtimeTheme,
    };
  }, [graph, graphLens, graphMode, graphViewModel, runtimeTheme]);
  const floatingTabsTop =
    insets.top +
    LEARNING_WORKSPACE_TOP_CHROME_OFFSET +
    (LEARNING_WORKSPACE_FLOATING_BUTTON_SIZE - GRAPH_MODE_SEGMENT_VISUAL_HEIGHT) / 2;

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

          {/* Top Floating Segmented Control */}
          <Animated.View
            entering={FadeInDown.duration(600).springify()}
            pointerEvents="box-none"
            style={[
              styles.graphModeTabsOverlay,
              {
                left: GRAPH_MODE_OVERLAY_SIDE_INSET,
                right: GRAPH_MODE_OVERLAY_SIDE_INSET,
                top: floatingTabsTop,
              },
            ]}
            testID="learning-graph-mode-tabs-overlay">
            <GraphModeTabs
              graphMode={graphMode}
              onSelect={setGraphMode}
            />
          </Animated.View>

          {graphMode === 'explore' && exploreFocus ? (
            <ExploreFocusStrip
              focus={exploreFocus}
              top={floatingTabsTop + GRAPH_MODE_SEGMENT_VISUAL_HEIGHT + 12}
            />
          ) : null}

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
  return {
    ...node,
    label: sanitizeLearningTextForDisplay(node.label ?? node.id) || String(node.id),
    semanticSummary:
      typeof node.semanticSummary === 'string'
        ? sanitizeLearningTextForDisplay(node.semanticSummary)
        : node.semanticSummary,
  };
}

function GraphModeTabs({
  graphMode,
  onSelect,
}: {
  graphMode: LearningGraphMode;
  onSelect: React.Dispatch<React.SetStateAction<LearningGraphMode>>;
}) {
  const { theme } = useAppTheme();
  const [trackWidth, setTrackWidth] = React.useState(GRAPH_MODE_SEGMENT_MAX_WIDTH);
  const indicatorWidth = Math.max(
    (trackWidth - GRAPH_MODE_SEGMENT_HORIZONTAL_PADDING * 2) / GRAPH_MODE_VALUES.length,
    0
  );
  const indicatorStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateX: withSpring(
            GRAPH_MODE_VALUES.indexOf(graphMode) * indicatorWidth,
            { damping: 24, stiffness: 280 }
          ),
        },
      ],
    }),
    [graphMode, indicatorWidth]
  );

  return (
    <View
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        if (nextWidth > 0 && Math.abs(nextWidth - trackWidth) > 1) {
          setTrackWidth(nextWidth);
        }
      }}
      style={styles.graphModeTabsShell}
      testID="learning-graph-mode-tabs">
      <View
        style={[
          styles.graphModeTabsTrack,
          {
            backgroundColor: theme.colors.surface,
            boxShadow: theme.shadows.card,
          },
        ]}>
        <Animated.View
          style={[
            styles.graphModeTabsIndicator,
            {
              backgroundColor: theme.colors.primarySoft,
              width: indicatorWidth,
            },
            indicatorStyle,
          ]}
        />
        {GRAPH_MODE_VALUES.map((mode) => {
          const active = graphMode === mode;

          return (
            <Pressable
              accessibilityRole="button"
              key={mode}
              onPress={() => onSelect(mode)}
              style={styles.graphModeTabButton}>
              <Text
                style={{
                  color: active ? theme.colors.primaryStrong : theme.colors.textMuted,
                  ...(active ? theme.typography.semiBold : theme.typography.medium),
                  fontSize: 14,
                }}>
                {GRAPH_MODE_LABELS[mode]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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

function ExploreFocusStrip({
  focus,
  top,
}: {
  focus: ReturnType<typeof resolveLearningExploreGraphFocus>;
  top: number;
}) {
  const { theme } = useAppTheme();
  const contextLabel = focus?.question ? '当前问题' : '当前探索焦点';
  const contextValue =
    focus?.question?.trim() ||
    (focus?.relatedConcepts?.length ? focus.relatedConcepts.slice(0, 3).join(' / ') : null);

  if (!contextValue) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(500).springify()}
      pointerEvents="none"
      style={[
        styles.graphModeFocusStrip,
        {
          top,
        },
      ]}
      testID="learning-graph-focus-strip">
      <GlassSurface
        intensity={54}
        style={{
          borderRadius: 22,
          borderWidth: 1,
          borderColor: theme.colors.borderSoft,
          gap: 6,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
        <GraphSheetText
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.semiBold,
            fontSize: 11,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}>
          {contextLabel}
        </GraphSheetText>
        <GraphSheetText
          style={{
            color: theme.colors.text,
            ...theme.typography.medium,
            fontSize: 14,
            lineHeight: 20,
          }}>
          {contextValue}
        </GraphSheetText>
        {focus?.relatedConcepts?.length ? (
          <GraphSheetText
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.medium,
              fontSize: 12,
              lineHeight: 18,
            }}>
            {`关联概念：${focus.relatedConcepts.slice(0, 4).join(' / ')}`}
          </GraphSheetText>
        ) : null}
      </GlassSurface>
    </Animated.View>
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
  graphModeTabButton: {
    alignItems: 'center',
    flex: 1,
    height: GRAPH_MODE_SEGMENT_MIN_HEIGHT,
    justifyContent: 'center',
    minWidth: 0,
    zIndex: 1,
  },
  graphModeTabsIndicator: {
    borderRadius: 18,
    bottom: GRAPH_MODE_SEGMENT_HORIZONTAL_PADDING,
    left: GRAPH_MODE_SEGMENT_HORIZONTAL_PADDING,
    position: 'absolute',
    top: GRAPH_MODE_SEGMENT_HORIZONTAL_PADDING,
  },
  graphModeTabsOverlay: {
    alignItems: 'center',
    position: 'absolute',
    zIndex: 10,
  },
  graphModeFocusStrip: {
    left: 20,
    position: 'absolute',
    right: 20,
    zIndex: 9,
  },
  graphModeTabsShell: {
    maxWidth: GRAPH_MODE_SEGMENT_MAX_WIDTH,
    minWidth: 0,
    width: '100%',
  },
  graphModeTabsTrack: {
    borderRadius: 24,
    flexDirection: 'row',
    padding: GRAPH_MODE_SEGMENT_HORIZONTAL_PADDING,
    position: 'relative',
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
              <SwiftScrollView showsIndicators={false}>
                <SwiftRNHostView>
                  <SelectionContent presentation={presentation} />
                </SwiftRNHostView>
              </SwiftScrollView>
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
                  style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: theme.colors.borderStrong,
                    }}
                  />
                  <GraphSheetText
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.body,
                      fontSize: 15,
                      lineHeight: 21,
                      flex: 1,
                    }}>
                    {line}
                  </GraphSheetText>
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
              有关资料切片
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
  return sanitizeLearningTextForDisplay(value);
}

function GraphDetailBody({
  content,
  style,
}: {
  content: string;
  style?: any;
}) {
  const sanitizedContent = sanitizeGraphDetailText(content);

  if (learningTextHasMalformedMath(String(content ?? ''))) {
    return <GraphSheetText style={style}>{sanitizedContent}</GraphSheetText>;
  }

  return (
    <LearningRichText
      allowFontScaling={false}
      content={sanitizedContent}
      maxFontSizeMultiplier={1}
      style={style}
    />
  );
}
