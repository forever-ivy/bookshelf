import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LearningPdfReaderWebView } from '@/components/learning/learning-pdf-reader-webview';
import { LearningWorkspaceLoadingState } from '@/components/learning/learning-workspace-loading-state';
import { useLearningWorkspaceScreen } from '@/components/learning/learning-workspace-provider';
import { LEARNING_WORKSPACE_TOP_CHROME_OFFSET } from '@/components/learning/learning-workspace-scaffold';
import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppSession } from '@/hooks/use-app-session';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  createLearningPdfAnnotation,
  getLearningReaderState,
  quickExplainLearningPdfSelection,
  updateLearningReaderProgress,
} from '@/lib/api/learning';
import { getLibraryErrorMessage } from '@/lib/api/client';
import type {
  LearningPdfAnnotation,
  LearningPdfAnnotationType,
  LearningQuickExplainInput,
  LearningQuickExplainResult,
  LearningReaderState,
} from '@/lib/api/types';
import { getLibraryServiceBaseUrl } from '@/lib/api/client';
import type {
  LearningPdfReaderOutlineItem,
  LearningPdfReaderPageTapPayload,
  LearningPdfReaderRuntimeInputMessage,
  LearningPdfReaderSearchResultPayload,
  LearningPdfReaderSelectionPayload,
} from '@/lib/learning/pdf-reader-bridge';
import { resolveLearningWorkspaceHasViewableDocument } from '@/lib/learning/workspace';

type ExplainTarget =
  | {
      kind: 'selection';
      payload: LearningPdfReaderSelectionPayload;
    }
  | {
      kind: 'tap';
      payload: LearningPdfReaderPageTapPayload;
    };

function DocumentState({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
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
        {title}
      </Text>
      <Text
        style={[
          styles.emptyBody,
          {
            color: theme.colors.textMuted,
            fontFamily: theme.typography.body.fontFamily,
          },
        ]}>
        {body}
      </Text>
    </View>
  );
}

function ReaderBusyState({ label }: { label: string }) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.readerBusyState}>
      <ActivityIndicator color={theme.colors.primaryStrong} />
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.body,
          fontSize: 14,
          lineHeight: 20,
        }}>
        {label}
      </Text>
    </View>
  );
}

function flattenOutline(
  items: LearningPdfReaderOutlineItem[],
  depth = 0
): Array<LearningPdfReaderOutlineItem & { depth: number }> {
  return items.flatMap((item) => [
    { ...item, depth },
    ...flattenOutline(item.items ?? [], depth + 1),
  ]);
}

function getExplainInputFromTarget(target: ExplainTarget): LearningQuickExplainInput {
  if (target.kind === 'selection') {
    return {
      anchor: target.payload.anchor,
      pageNumber: target.payload.pageNumber,
      selectedText: target.payload.selectedText,
      surroundingText: target.payload.surroundingText,
    };
  }

  return {
    anchor: target.payload.anchor,
    nearbyText: target.payload.nearbyText,
    pageNumber: target.payload.pageNumber,
  };
}

function getSelectedTextFromTarget(target: ExplainTarget | null) {
  if (!target) {
    return '';
  }

  return target.kind === 'selection'
    ? target.payload.selectedText
    : target.payload.nearbyText ?? target.payload.anchor.textQuote ?? '';
}

function getAnchorFromTarget(target: ExplainTarget | null) {
  if (!target) {
    return null;
  }

  return target.payload.anchor;
}

function getPageNumberFromTarget(target: ExplainTarget | null) {
  return target?.payload.pageNumber ?? 1;
}

function resolveDocumentUrl(baseUrl: string | null, documentPath: string | null) {
  if (!baseUrl || !documentPath) {
    return null;
  }

  try {
    return new URL(documentPath, baseUrl).toString();
  } catch {
    return null;
  }
}

export default function LearningWorkspaceDocumentRoute() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { token } = useAppSession();
  const { closeWorkspace, profile, workspaceGate } = useLearningWorkspaceScreen();
  const queryClient = useQueryClient();
  const [documentErrorState, setDocumentErrorState] = React.useState<
    'document_missing' | 'generic' | null
  >(null);
  const [documentErrorMessage, setDocumentErrorMessage] = React.useState<string | null>(null);
  const [outline, setOutline] = React.useState<LearningPdfReaderOutlineItem[]>([]);
  const [drawerMode, setDrawerMode] = React.useState<'annotations' | 'outline'>('outline');
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResult, setSearchResult] =
    React.useState<LearningPdfReaderSearchResultPayload | null>(null);
  const [readerCommand, setReaderCommand] =
    React.useState<LearningPdfReaderRuntimeInputMessage | null>(null);
  const [selection, setSelection] = React.useState<LearningPdfReaderSelectionPayload | null>(
    null
  );
  const [tapTarget, setTapTarget] = React.useState<LearningPdfReaderPageTapPayload | null>(null);
  const [explainTarget, setExplainTarget] = React.useState<ExplainTarget | null>(null);
  const [quickExplain, setQuickExplain] = React.useState<LearningQuickExplainResult | null>(null);
  const [noteModalOpen, setNoteModalOpen] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState('');
  const [documentTitle, setDocumentTitle] = React.useState<string | null>(null);
  const [pageSummary, setPageSummary] = React.useState({ pageCount: 0, pageNumber: 1, scale: 1 });

  const baseUrl = getLibraryServiceBaseUrl();
  const profileId = profile?.id ?? 0;
  const hasViewableDocument = profile ? resolveLearningWorkspaceHasViewableDocument(profile) : false;
  const documentPath =
    profile && hasViewableDocument ? `/api/v2/learning/profiles/${profile.id}/document` : null;
  const documentUrl = resolveDocumentUrl(baseUrl, documentPath);
  const readerStateQueryKey = ['learning-reader-state', profileId] as const;
  const readerStateQuery = useQuery({
    enabled:
      workspaceGate.kind === 'ready' && Boolean(profile && documentUrl && hasViewableDocument),
    queryFn: () => getLearningReaderState(profileId, token),
    queryKey: readerStateQueryKey,
  });

  const progressMutation = useMutation({
    mutationFn: (input: { pageNumber: number; scale: number }) =>
      updateLearningReaderProgress(
        profileId,
        {
          layoutMode: 'horizontal',
          pageNumber: input.pageNumber,
          scale: input.scale,
        },
        token
      ),
  });

  const annotationMutation = useMutation({
    mutationFn: (input: {
      annotationType: LearningPdfAnnotationType;
      color?: string | null;
      noteText?: string | null;
      target: ExplainTarget;
    }) => {
      const anchor = getAnchorFromTarget(input.target);
      const selectedText = getSelectedTextFromTarget(input.target);
      if (!anchor || !selectedText.trim()) {
        throw new Error('annotation target is empty');
      }

      return createLearningPdfAnnotation(
        profileId,
        {
          anchor,
          annotationType: input.annotationType,
          color: input.color ?? (input.annotationType === 'note' ? '#8ecae6' : '#f7d56e'),
          noteText: input.noteText ?? null,
          pageNumber: getPageNumberFromTarget(input.target),
          selectedText,
        },
        token
      );
    },
    onSuccess: (annotation) => {
      queryClient.setQueryData<LearningReaderState | undefined>(
        readerStateQueryKey,
        (current) =>
          current
            ? {
                ...current,
                annotations: [
                  ...current.annotations.filter((item) => item.id !== annotation.id),
                  annotation,
                ],
              }
            : current
      );
      setReaderCommand({
        annotation,
        type: 'applySelectionHighlight',
      });
    },
  });

  const quickExplainMutation = useMutation({
    mutationFn: (input: LearningQuickExplainInput) =>
      quickExplainLearningPdfSelection(profileId, input, token),
    onSuccess: (result) => setQuickExplain(result),
  });

  React.useEffect(() => {
    setDocumentErrorState(null);
    setDocumentErrorMessage(null);
    setOutline([]);
    setSelection(null);
    setTapTarget(null);
    setQuickExplain(null);
    setPageSummary({ pageCount: 0, pageNumber: 1, scale: 1 });
  }, [profile?.id]);

  const openOutlineDrawer = React.useCallback(() => {
    setDrawerMode('outline');
    setDrawerOpen(true);
  }, []);

  const openAnnotationsDrawer = React.useCallback(() => {
    setDrawerMode('annotations');
    setDrawerOpen(true);
  }, []);

  const runSearch = React.useCallback(() => {
    const query = searchQuery.trim();
    if (!query) {
      setReaderCommand({ type: 'clearSearch' });
      setSearchResult(null);
      return;
    }

    setReaderCommand({
      query,
      type: 'runSearch',
    });
  }, [searchQuery]);

  const handleSelectionChanged = React.useCallback(
    (payload: LearningPdfReaderSelectionPayload) => {
      setSelection(payload);
      setTapTarget(null);
      setExplainTarget({ kind: 'selection', payload });
      setQuickExplain(null);
    },
    []
  );

  const handlePageTap = React.useCallback((payload: LearningPdfReaderPageTapPayload) => {
    setTapTarget(payload);
    setSelection(null);
    setExplainTarget({ kind: 'tap', payload });
    setQuickExplain(null);
  }, []);

  const handlePageChanged = React.useCallback(
    (payload: { pageNumber: number; scale: number }) => {
      setPageSummary((current) => ({
        ...current,
        pageNumber: payload.pageNumber,
        scale: payload.scale,
      }));
      if (profileId > 0) {
        progressMutation.mutate(payload);
      }
    },
    [profileId, progressMutation]
  );

  const createAnnotationForTarget = React.useCallback(
    (
      target: ExplainTarget | null,
      annotationType: LearningPdfAnnotationType,
      noteText?: string | null
    ) => {
      if (!target) {
        return;
      }

      annotationMutation.mutate({
        annotationType,
        noteText,
        target,
      });
      if (annotationType === 'highlight') {
        setSelection(null);
      }
    },
    [annotationMutation]
  );

  const explainCurrentTarget = React.useCallback(
    (target: ExplainTarget | null) => {
      if (!target) {
        return;
      }

      setExplainTarget(target);
      setQuickExplain(null);
      quickExplainMutation.mutate(getExplainInputFromTarget(target));
    },
    [quickExplainMutation]
  );

  const saveQuickExplainAsNote = React.useCallback(() => {
    if (!explainTarget || !quickExplain?.answer) {
      return;
    }

    createAnnotationForTarget(explainTarget, 'note', quickExplain.answer);
  }, [createAnnotationForTarget, explainTarget, quickExplain?.answer]);

  const openNoteModal = React.useCallback((target: ExplainTarget | null) => {
    if (!target) {
      return;
    }

    setExplainTarget(target);
    setNoteDraft('');
    setNoteModalOpen(true);
  }, []);

  const saveNoteDraft = React.useCallback(() => {
    const noteText = noteDraft.trim();
    if (!noteText || !explainTarget) {
      return;
    }

    createAnnotationForTarget(explainTarget, 'note', noteText);
    setNoteModalOpen(false);
    setNoteDraft('');
  }, [createAnnotationForTarget, explainTarget, noteDraft]);

  const renderOutlineRow = React.useCallback(
    (item: LearningPdfReaderOutlineItem & { depth: number }, index: number) => (
      <Pressable
        key={`${item.title}-${index}`}
        onPress={() => {
          if (item.pageNumber) {
            setReaderCommand({
              pageNumber: item.pageNumber,
              type: 'goToPage',
            });
            setDrawerOpen(false);
          }
        }}
        style={({ pressed }) => [
          styles.drawerRow,
          {
            backgroundColor: pressed ? theme.colors.surfaceTint : 'transparent',
            paddingLeft: 14 + item.depth * 14,
          },
        ]}>
        <Text
          numberOfLines={2}
          style={{
            color: theme.colors.text,
            ...theme.typography.medium,
            fontSize: 14,
            lineHeight: 20,
          }}>
          {item.title}
        </Text>
        {item.pageNumber ? (
          <Text style={[styles.drawerMeta, { color: theme.colors.textMuted }]}>
            第 {item.pageNumber} 页
          </Text>
        ) : null}
      </Pressable>
    ),
    [theme]
  );

  const renderAnnotationRow = React.useCallback(
    (annotation: LearningPdfAnnotation) => (
      <Pressable
        key={annotation.id}
        onPress={() => {
          setReaderCommand({
            annotationId: annotation.id,
            type: 'focusAnnotation',
          });
          setDrawerOpen(false);
        }}
        style={({ pressed }) => [
          styles.drawerRow,
          {
            backgroundColor: pressed ? theme.colors.surfaceTint : 'transparent',
          },
        ]}>
        <Text
          numberOfLines={3}
          style={{
            color: theme.colors.text,
            ...theme.typography.medium,
            fontSize: 14,
            lineHeight: 20,
          }}>
          {annotation.noteText || annotation.selectedText}
        </Text>
        <Text style={[styles.drawerMeta, { color: theme.colors.textMuted }]}>
          {annotation.annotationType === 'note' ? '笔记' : '高亮'} · 第 {annotation.pageNumber} 页
        </Text>
      </Pressable>
    ),
    [theme]
  );

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

  const readerState = readerStateQuery.data;
  const shouldShowReader = Boolean(documentUrl && readerState && !documentErrorState);
  const floatingChromeTop = insets.top + LEARNING_WORKSPACE_TOP_CHROME_OFFSET;
  const actionTarget: ExplainTarget | null = selection
    ? { kind: 'selection', payload: selection }
    : tapTarget
      ? { kind: 'tap', payload: tapTarget }
      : null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.backgroundWorkspace,
        },
      ]}>
      {shouldShowReader ? (
        <LearningPdfReaderWebView
          command={readerCommand}
          documentUrl={documentUrl!}
          onDocumentLoadFailed={(message) => {
            setDocumentErrorState('generic');
            setDocumentErrorMessage(message);
          }}
          onDocumentLoaded={(payload) => {
            setDocumentTitle(payload.title?.trim() || profile.title);
            setPageSummary((current) => ({
              ...current,
              pageCount: payload.pageCount,
            }));
          }}
          onOutlineLoaded={setOutline}
          onPageChanged={handlePageChanged}
          onPageTap={handlePageTap}
          onRuntimeError={(message) => {
            setDocumentErrorMessage(message);
            setDocumentErrorState(message.includes('404') ? 'document_missing' : 'generic');
          }}
          onSearchResultChanged={setSearchResult}
          onSelectionChanged={handleSelectionChanged}
          readerState={readerState}
          token={token}
        />
      ) : documentUrl && readerStateQuery.isLoading ? (
        <ReaderBusyState label="正在同步阅读进度与批注..." />
      ) : readerStateQuery.error ? (
        <DocumentState
          body={getLibraryErrorMessage(
            readerStateQuery.error,
            '阅读器状态同步失败，请确认后端服务与登录状态。'
          )}
          title="阅读器初始化失败"
        />
      ) : documentErrorState === 'document_missing' ? (
        <DocumentState
          body="这个导学本记录了 PDF，但后端当前找不到对应文件。请重新生成资料或补齐服务端 artifacts。"
          title="资料 PDF 缺失"
        />
      ) : documentErrorState === 'generic' ? (
        <DocumentState
          body={
            documentErrorMessage
              ? `PDF 阅读器初始化失败：${documentErrorMessage}`
              : 'PDF 阅读器初始化失败。请重试；如果持续失败，再检查当前开发包是否已重新构建并包含 WebView 模块。'
          }
          title="PDF 打开失败"
        />
      ) : (
        <DocumentState
          body="当前导学本还没有可直接打开的 PDF 原件，后续补齐后会在这里展示。"
          title="暂不支持查看资料"
        />
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

      {shouldShowReader ? (
        <View
          style={[
            styles.readerToolbar,
            {
              backgroundColor: theme.colors.surfaceTint,
              borderColor: theme.colors.borderSoft,
              top: floatingChromeTop,
            },
          ]}>
          <Pressable onPress={openOutlineDrawer} style={styles.toolbarButton}>
            <Text style={[styles.toolbarButtonText, { color: theme.colors.text }]}>目录</Text>
          </Pressable>
          <Pressable onPress={() => setSearchOpen((value) => !value)} style={styles.toolbarButton}>
            <Text style={[styles.toolbarButtonText, { color: theme.colors.text }]}>搜索</Text>
          </Pressable>
          <Pressable onPress={openAnnotationsDrawer} style={styles.toolbarButton}>
            <Text style={[styles.toolbarButtonText, { color: theme.colors.text }]}>笔记</Text>
          </Pressable>
        </View>
      ) : null}

      {shouldShowReader ? (
        <View
          pointerEvents="none"
          style={[styles.pagePill, { bottom: insets.bottom + 18 }]}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {documentTitle || profile.title} · {pageSummary.pageNumber}
            {pageSummary.pageCount ? ` / ${pageSummary.pageCount}` : ''} 页
          </Text>
        </View>
      ) : null}

      {searchOpen && shouldShowReader ? (
        <View
          style={[
            styles.searchPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              top: floatingChromeTop + 58,
            },
          ]}>
          <TextInput
            onChangeText={setSearchQuery}
            onSubmitEditing={runSearch}
            placeholder="搜索当前 PDF"
            placeholderTextColor={theme.colors.textSoft}
            returnKeyType="search"
            style={[
              styles.searchInput,
              {
                borderColor: theme.colors.borderSoft,
                color: theme.colors.text,
              },
            ]}
            value={searchQuery}
          />
          <Pressable onPress={runSearch} style={styles.primaryActionButton}>
            <Text style={styles.primaryActionText}>查找</Text>
          </Pressable>
          {searchResult ? (
            <Text style={[styles.searchResultText, { color: theme.colors.textMuted }]}>
              {searchResult.total > 0
                ? `找到 ${searchResult.total} 处，当前第 ${searchResult.activeIndex + 1} 处`
                : '未找到匹配内容'}
            </Text>
          ) : null}
        </View>
      ) : null}

      {actionTarget ? (
        <View
          style={[
            styles.selectionBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              bottom: insets.bottom + 62,
            },
          ]}>
          <Text
            numberOfLines={2}
            style={{
              color: theme.colors.text,
              ...theme.typography.medium,
              flex: 1,
              fontSize: 13,
              lineHeight: 18,
            }}>
            {getSelectedTextFromTarget(actionTarget)}
          </Text>
          <Pressable
            onPress={() => explainCurrentTarget(actionTarget)}
            style={styles.secondaryActionButton}>
            <Text style={[styles.secondaryActionText, { color: theme.colors.primaryStrong }]}>
              快速解释
            </Text>
          </Pressable>
          {actionTarget.kind === 'selection' ? (
            <Pressable
              onPress={() => createAnnotationForTarget(actionTarget, 'highlight')}
              style={styles.secondaryActionButton}>
              <Text style={[styles.secondaryActionText, { color: theme.colors.primaryStrong }]}>
                高亮
              </Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => openNoteModal(actionTarget)}
            style={styles.secondaryActionButton}>
            <Text style={[styles.secondaryActionText, { color: theme.colors.primaryStrong }]}>
              笔记
            </Text>
          </Pressable>
        </View>
      ) : null}

      {(quickExplain || quickExplainMutation.isPending) && explainTarget ? (
        <View
          style={[
            styles.explainPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              bottom: insets.bottom + 128,
            },
          ]}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.bold,
              fontSize: 15,
              lineHeight: 20,
            }}>
            快速解释
          </Text>
          <Text
            selectable
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 14,
              lineHeight: 21,
            }}>
            {quickExplainMutation.isPending ? '正在生成解释...' : quickExplain?.answer}
          </Text>
          {quickExplain?.modelName ? (
            <Text style={[styles.drawerMeta, { color: theme.colors.textSoft }]}>
              模型：{quickExplain.modelName}
            </Text>
          ) : null}
          <View style={styles.inlineActions}>
            <Pressable
              disabled={!quickExplain?.answer}
              onPress={saveQuickExplainAsNote}
              style={styles.primaryActionButton}>
              <Text style={styles.primaryActionText}>存为笔记</Text>
            </Pressable>
            <Pressable onPress={() => setQuickExplain(null)} style={styles.secondaryActionButton}>
              <Text style={[styles.secondaryActionText, { color: theme.colors.textMuted }]}>
                关闭
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={() => setDrawerOpen(false)}
        transparent
        visible={drawerOpen}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDrawerOpen(false)} />
        <View
          style={[
            styles.drawerPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              paddingTop: insets.top + 18,
            },
          ]}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.bold,
              fontSize: 20,
              lineHeight: 26,
            }}>
            {drawerMode === 'outline' ? '文档目录' : '高亮与笔记'}
          </Text>
          <ScrollView contentContainerStyle={styles.drawerList}>
            {drawerMode === 'outline'
              ? flattenOutline(outline).map(renderOutlineRow)
              : readerState?.annotations.map(renderAnnotationRow)}
            {drawerMode === 'outline' && outline.length === 0 ? (
              <Text style={[styles.emptyDrawerText, { color: theme.colors.textMuted }]}>
                这份 PDF 暂未解析出目录。
              </Text>
            ) : null}
            {drawerMode === 'annotations' && readerState?.annotations.length === 0 ? (
              <Text style={[styles.emptyDrawerText, { color: theme.colors.textMuted }]}>
                还没有高亮或笔记。
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setNoteModalOpen(false)}
        transparent
        visible={noteModalOpen}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNoteModalOpen(false)} />
        <View
          style={[
            styles.noteModal,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
            },
          ]}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.bold,
              fontSize: 18,
              lineHeight: 24,
            }}>
            添加笔记
          </Text>
          <TextInput
            multiline
            onChangeText={setNoteDraft}
            placeholder="写下这段的理解、疑问或复习提示"
            placeholderTextColor={theme.colors.textSoft}
            style={[
              styles.noteInput,
              {
                borderColor: theme.colors.borderSoft,
                color: theme.colors.text,
              },
            ]}
            value={noteDraft}
          />
          <View style={styles.inlineActions}>
            <Pressable onPress={saveNoteDraft} style={styles.primaryActionButton}>
              <Text style={styles.primaryActionText}>保存</Text>
            </Pressable>
            <Pressable onPress={() => setNoteModalOpen(false)} style={styles.secondaryActionButton}>
              <Text style={[styles.secondaryActionText, { color: theme.colors.textMuted }]}>
                取消
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  drawerList: {
    gap: 8,
    paddingBottom: 32,
    paddingTop: 16,
  },
  drawerMeta: {
    fontSize: 12,
    lineHeight: 17,
  },
  drawerPanel: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
    top: 0,
    width: '82%',
  },
  drawerRow: {
    borderRadius: 14,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyDrawerText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
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
  explainPanel: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
    left: 14,
    padding: 14,
    position: 'absolute',
    right: 14,
    zIndex: 160,
  },
  floatingChrome: {
    left: 16,
    position: 'absolute',
    zIndex: 120,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(22, 18, 14, 0.32)',
  },
  noteInput: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 120,
    padding: 12,
    textAlignVertical: 'top',
  },
  noteModal: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
    left: 18,
    padding: 16,
    position: 'absolute',
    right: 18,
    top: '26%',
  },
  pagePill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 253, 248, 0.84)',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    position: 'absolute',
    zIndex: 80,
  },
  primaryActionButton: {
    backgroundColor: '#2d4c3c',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryActionText: {
    color: '#fffdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  readerBusyState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  readerToolbar: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    position: 'absolute',
    right: 16,
    zIndex: 120,
  },
  searchInput: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchPanel: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    left: 16,
    padding: 10,
    position: 'absolute',
    right: 16,
    zIndex: 130,
  },
  searchResultText: {
    bottom: -22,
    fontSize: 12,
    left: 12,
    position: 'absolute',
  },
  secondaryActionButton: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  selectionBar: {
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
    left: 14,
    padding: 10,
    position: 'absolute',
    right: 14,
    zIndex: 150,
  },
  toolbarButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  toolbarButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
