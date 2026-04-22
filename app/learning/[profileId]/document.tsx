import Pdf, { type PdfRef } from 'react-native-pdf';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  Layout,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { 
  Settings2, 
  ChevronUp, 
  ChevronDown, 
  Maximize, 
  Minimize, 
  Columns as HorizontalIcon,
  Rows as VerticalIcon
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/base/glass-surface';
import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';
import { LEARNING_WORKSPACE_TOP_CHROME_OFFSET } from '@/components/learning/learning-workspace-scaffold';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryServiceBaseUrl } from '@/lib/api/client';
import { resolveLearningWorkspaceHasViewableDocument } from '@/lib/learning/workspace';

const MIN_SCALE = 0.75;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

type ReadingDisplayMode = 'vertical' | 'horizontal';

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatScale(scale: number) {
  return `${Math.round(scale * 100)}%`;
}

function UnsupportedDocumentState() {
  const { theme } = useAppTheme();

  return (
    <View style={styles.emptyState}>
      <Text
        style={[
          styles.emptyTitle,
          {
            color: theme.colors.text,
            fontFamily: theme.typography.bold.fontFamily,
          },
        ]}>
        暂不支持查看资料
      </Text>
      <Text
        style={[
          styles.emptyBody,
          {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.body.fontFamily,
          },
        ]}>
        当前导学本还没有可直接打开的 PDF 原件，后续补齐后会在这里展示。
      </Text>
    </View>
  );
}

export default function LearningWorkspaceDocumentRoute() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAppSession();
  const { closeWorkspace, profile, workspaceGate } = useLearningWorkspaceScreen();
  const pdfRef = React.useRef<PdfRef>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [displayMode, setDisplayMode] = React.useState<ReadingDisplayMode>('vertical');
  const [loadProgress, setLoadProgress] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(0);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [pageInput, setPageInput] = React.useState('1');
  const [scale, setScale] = React.useState(1);
  const [isControlsExpanded, setIsControlsExpanded] = React.useState(true);

  React.useEffect(() => {
    setLoadFailed(false);
    setLoadProgress(0);
    setPageCount(0);
    setPageNumber(1);
    setPageInput('1');
    setScale(1);
  }, [profile?.id]);

  const clampPage = React.useCallback(
    (value: number) => {
      const normalized = Number.isFinite(value) ? Math.trunc(value) : 1;
      return clampNumber(normalized, 1, pageCount || normalized || 1);
    },
    [pageCount]
  );

  const goToPage = React.useCallback(
    (value: number) => {
      const targetPage = clampPage(value);
      pdfRef.current?.setPage(targetPage);
      setPageNumber(targetPage);
      setPageInput(String(targetPage));
    },
    [clampPage]
  );

  const submitPageInput = React.useCallback(() => {
    goToPage(Number.parseInt(pageInput, 10));
  }, [goToPage, pageInput]);

  const updateScale = React.useCallback((nextScale: number) => {
    setScale(Number(clampNumber(nextScale, MIN_SCALE, MAX_SCALE).toFixed(2)));
  }, []);

  if (workspaceGate.kind !== 'ready' || !profile) {
    return (
      <LearningWorkspaceLoadingState
        description={workspaceGate.description}
        secondaryAction={{
          label: '返回导学本库',
          onPress: closeWorkspace,
        }}
        title={workspaceGate.title}
        visualState={workspaceGate.kind === 'loading' ? 'skeleton' : 'copy'}
      />
    );
  }

  const baseUrl = getLibraryServiceBaseUrl();
  const hasViewableDocument = resolveLearningWorkspaceHasViewableDocument(profile);
  const documentSource =
    baseUrl && hasViewableDocument
      ? {
          cache: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          uri: `${baseUrl}/api/v2/learning/profiles/${profile.id}/document`,
        }
      : null;
  const floatingChromeTop = insets.top + LEARNING_WORKSPACE_TOP_CHROME_OFFSET;
  const isHorizontalMode = displayMode === 'horizontal';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.backgroundWorkspace,
        },
      ]}>
      {documentSource && !loadFailed ? (
        <Pdf
          enableDoubleTapZoom
          enablePaging={isHorizontalMode}
          fitPolicy={2}
          horizontal={isHorizontalMode}
          maxScale={MAX_SCALE}
          minScale={MIN_SCALE}
          onError={() => setLoadFailed(true)}
          onLoadComplete={(numberOfPages) => {
            const safePageCount = Math.max(numberOfPages, 1);
            const nextPage = clampNumber(pageNumber, 1, safePageCount);
            setPageCount(safePageCount);
            setPageNumber(nextPage);
            setPageInput(String(nextPage));
          }}
          onLoadProgress={(percent) => setLoadProgress(clampNumber(percent, 0, 1))}
          onPageChanged={(page, numberOfPages) => {
            setPageCount(numberOfPages);
            setPageNumber(page);
            setPageInput(String(page));
          }}
          onPageSingleTap={(page) => {
            setPageNumber(page);
            setPageInput(String(page));
          }}
          onScaleChanged={updateScale}
          page={pageNumber}
          ref={pdfRef}
          scale={scale}
          source={documentSource}
          style={styles.viewer}
          trustAllCerts={false}
        />
      ) : (
        <UnsupportedDocumentState />
      )}

      <View
        pointerEvents="box-none"
        style={[styles.floatingChrome, { top: floatingChromeTop }]}
        testID="learning-workspace-document-floating-chrome">
        <SecondaryBackButton
          label="返回学习区"
          onPress={closeWorkspace}
          testID="learning-workspace-document-back-glass"
        />
      </View>

      {documentSource && !loadFailed ? (
        <FloatingReaderControls
          displayMode={displayMode}
          isExpanded={isControlsExpanded}
          loadProgress={loadProgress}
          onGoToPage={goToPage}
          onSetDisplayMode={setDisplayMode}
          onSetExpanded={setIsControlsExpanded}
          onSetPageInput={setPageInput}
          onSubmitPageInput={submitPageInput}
          onUpdateScale={updateScale}
          pageCount={pageCount}
          pageInput={pageInput}
          pageNumber={pageNumber}
          scale={scale}
        />
      ) : null}
    </View>
  );
}

function FloatingReaderControls({
  displayMode,
  isExpanded,
  onSetDisplayMode,
  onSetExpanded,
  pageCount,
  pageInput,
  pageNumber,
  scale,
  onGoToPage,
  onSetPageInput,
  onSubmitPageInput,
  onUpdateScale,
  loadProgress,
}: {
  displayMode: ReadingDisplayMode;
  isExpanded: boolean;
  onSetDisplayMode: (mode: ReadingDisplayMode) => void;
  onSetExpanded: (expanded: boolean) => void;
  pageCount: number;
  pageInput: string;
  pageNumber: number;
  scale: number;
  onGoToPage: (page: number) => void;
  onSetPageInput: (input: string) => void;
  onSubmitPageInput: () => void;
  onUpdateScale: (scale: number) => void;
  loadProgress: number;
}) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 20);

  // Scrubber variables
  const TRACK_HEIGHT = 220;
  const progress = pageCount > 1 ? (pageNumber - 1) / (pageCount - 1) : 0;
  const bubblePosition = progress * (TRACK_HEIGHT - 32);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.floatingControlsWrapper, { bottom: bottomInset }]}>
      
      {/* Vertical Page Track (Upwards) */}
      {isExpanded && (
        <Animated.View
          entering={FadeInDown.springify().damping(22).stiffness(240).delay(50)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.trackWrapper, { height: TRACK_HEIGHT, bottom: 72 }]}>
          <GlassSurface intensity={95} style={styles.scrubberTrack}>
            <View style={[styles.trackLine, { backgroundColor: theme.colors.borderSoft }]} />
            <Animated.View 
              layout={Layout.springify().damping(25).stiffness(200)}
              style={[
                styles.pageBubble, 
                { 
                  transform: [{ translateY: bubblePosition }],
                  backgroundColor: theme.colors.surfaceStrong,
                  boxShadow: theme.shadows.medium,
                }
              ]}>
              <Text style={[styles.bubbleText, { color: theme.colors.text }]}>{pageNumber}</Text>
            </Animated.View>
          </GlassSurface>
        </Animated.View>
      )}

      {/* Horizontal Settings Tray (Leftwards) */}
      {isExpanded && (
        <Animated.View
          entering={SlideInRight.springify().damping(22).stiffness(240)}
          exiting={SlideOutRight.duration(200)}
          style={[styles.trayWrapper, { right: 72 }]}>
          <GlassSurface intensity={95} style={styles.settingsTray}>
            <View style={styles.traySection}>
              <Pressable
                onPress={() => onUpdateScale(scale - SCALE_STEP)}
                style={({ pressed }) => [styles.trayIconBtn, pressed && { opacity: 0.6 }]}>
                <Minimize color={theme.colors.text} size={18} />
              </Pressable>
              
              <View style={styles.scaleBox}>
                <Text style={[styles.scaleLabelMini, { color: theme.colors.primaryStrong }]}>{formatScale(scale)}</Text>
              </View>

              <Pressable
                onPress={() => onUpdateScale(scale + SCALE_STEP)}
                style={({ pressed }) => [styles.trayIconBtn, pressed && { opacity: 0.6 }]}>
                <Maximize color={theme.colors.text} size={18} />
              </Pressable>
            </View>

            <View style={[styles.verticalDivider, { backgroundColor: theme.colors.borderSoft }]} />

            <View style={styles.traySection}>
              {(['vertical', 'horizontal'] as const).map((mode) => {
                const active = displayMode === mode;
                const Icon = mode === 'vertical' ? VerticalIcon : HorizontalIcon;
                return (
                  <Pressable
                    key={mode}
                    onPress={() => onSetDisplayMode(mode)}
                    style={[
                      styles.modeIconBtn, 
                      active && { backgroundColor: theme.colors.surfaceAccent, boxShadow: theme.shadows.small }
                    ]}>
                    <Icon color={active ? theme.colors.primaryStrong : theme.colors.textMuted} size={18} />
                  </Pressable>
                );
              })}
            </View>
          </GlassSurface>
        </Animated.View>
      )}

      {/* Floating Action Button (Main Trigger) */}
      <Pressable
        onPress={() => onSetExpanded(!isExpanded)}
        style={({ pressed }) => [
          styles.fabCrystal,
          { 
            backgroundColor: isExpanded ? theme.colors.primaryStrong : theme.colors.surface,
            borderColor: 'rgba(255,255,255,0.2)',
            opacity: pressed ? 0.85 : 1,
            boxShadow: theme.shadows.card,
            transform: [{ scale: pressed ? 0.94 : 1 }]
          }
        ]}>
        <Animated.View style={{ transform: [{ rotate: isExpanded ? '135deg' : '0deg' }] }}>
          <Settings2 
            color={isExpanded ? '#fff' : theme.colors.text} 
            size={28} 
            strokeWidth={2.5} 
          />
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlButtonDisabled: {
    opacity: 0.36,
  },
  controlButtonText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
  },
  controlRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  displayModeControl: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    position: 'absolute',
    right: 16,
    zIndex: 120,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    letterSpacing: -0.4,
    lineHeight: 28,
    textAlign: 'center',
  },
  floatingChrome: {
    left: 16,
    position: 'absolute',
    zIndex: 120,
  },
  pageInput: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
    lineHeight: 18,
    minHeight: 38,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
  },
  readerControls: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    left: 14,
    padding: 12,
    position: 'absolute',
    right: 14,
    zIndex: 130,
  },
  segmentButton: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  segmentText: {
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
  },
  viewer: {
    flex: 1,
  },
  floatingControlsWrapper: {
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    zIndex: 1000,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    width: 260,
    height: 400,
  },
  fabCrystal: {
    borderRadius: 30,
    height: 60,
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  trackWrapper: {
    position: 'absolute',
    right: 16,
  },
  scrubberTrack: {
    width: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  expandedSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    width: '100%',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconButtonSmall: {
    borderRadius: 12,
    height: 36,
    width: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicatorBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pageInputCompact: {
    fontSize: 16,
    textAlign: 'center',
    minWidth: 24,
    padding: 0,
  },
  pageTotalText: {
    fontSize: 14,
  },
  jumpButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  jumpButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 16,
    padding: 3,
    gap: 2,
  },
  modeSegmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 13,
  },
  modeSegmentText: {
    fontSize: 12,
  },
  scaleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scaleValueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scaleControlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scaleActionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleResetBtn: {
    flex: 1.5,
    flexDirection: 'row',
  },
  resetText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
