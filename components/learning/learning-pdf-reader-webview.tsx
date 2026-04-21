import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LearningReaderState } from '@/lib/api/types';
import type {
  LearningPdfReaderOutlineItem,
  LearningPdfReaderPageTapPayload,
  LearningPdfReaderRuntimeInputMessage,
  LearningPdfReaderRuntimeOutputMessage,
  LearningPdfReaderSearchResultPayload,
  LearningPdfReaderSelectionPayload,
} from '@/lib/learning/pdf-reader-bridge';
import {
  buildLearningPdfReaderRuntimeHtml,
  buildLearningPdfReaderLoaderScript,
  chunkLearningPdfReaderRuntimeBundle,
  LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL,
} from '@/lib/learning/pdf-reader-runtime';

import {
  learningPdfReaderRuntimeBundle,
} from '@/components/learning/learning-pdf-reader-runtime.generated';
import { useAppTheme } from '@/hooks/use-app-theme';

type LearningPdfReaderWebViewProps = {
  command: LearningPdfReaderRuntimeInputMessage | null;
  documentUrl: string;
  onDocumentLoadFailed: (message: string) => void;
  onDocumentLoaded: (payload: { pageCount: number; title?: string | null }) => void;
  onOutlineLoaded: (outline: LearningPdfReaderOutlineItem[]) => void;
  onPageChanged: (payload: { pageNumber: number; scale: number }) => void;
  onPageTap: (payload: LearningPdfReaderPageTapPayload) => void;
  onRuntimeError: (message: string) => void;
  onSearchResultChanged: (payload: LearningPdfReaderSearchResultPayload) => void;
  onSelectionChanged: (payload: LearningPdfReaderSelectionPayload) => void;
  readerState: LearningReaderState;
  token?: string | null;
};

type WebViewComponent = React.ComponentType<Record<string, unknown>>;

export function resolveLearningPdfReaderWebViewModule(
  loader: () => { WebView?: WebViewComponent }
): WebViewComponent | null {
  try {
    return loader().WebView ?? null;
  } catch {
    return null;
  }
}

export function LearningPdfReaderWebViewUnavailable({
  body,
  title,
}: {
  body: string;
  title: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.unavailableState}>
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.heading,
          fontSize: 20,
          lineHeight: 26,
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

export function LearningPdfReaderWebView({
  command,
  documentUrl,
  onDocumentLoadFailed,
  onDocumentLoaded,
  onOutlineLoaded,
  onPageChanged,
  onPageTap,
  onRuntimeError,
  onSearchResultChanged,
  onSelectionChanged,
  readerState,
  token,
}: LearningPdfReaderWebViewProps) {
  const WebView = React.useMemo(
    () => resolveLearningPdfReaderWebViewModule(() => require('react-native-webview')),
    []
  );
  const webViewRef = React.useRef<any>(null);
  const runtimeLoadTicketRef = React.useRef(0);
  const loaderInjectedRef = React.useRef(false);
  const runtimeInjectedRef = React.useRef(false);
  const [isReady, setIsReady] = React.useState(false);
  const initialReaderStateRef = React.useRef(readerState);
  const loaderScript = React.useMemo(
    () =>
      buildLearningPdfReaderLoaderScript({
        authorizationHeader: token ? `Bearer ${token}` : null,
        documentUrl,
        initialAnnotations: initialReaderStateRef.current.annotations,
        initialLayoutMode:
          initialReaderStateRef.current.progress.layoutMode ?? 'horizontal',
        initialPageNumber: initialReaderStateRef.current.progress.pageNumber ?? 1,
        initialScale: initialReaderStateRef.current.progress.scale ?? 1,
        readerId: initialReaderStateRef.current.readerId,
      }),
    [documentUrl, token]
  );
  const runtimeHtml = React.useMemo(() => buildLearningPdfReaderRuntimeHtml(), []);
  const runtimeChunks = React.useMemo(
    () => chunkLearningPdfReaderRuntimeBundle(learningPdfReaderRuntimeBundle),
    []
  );

  const postRuntimeMessage = React.useCallback((message: LearningPdfReaderRuntimeInputMessage) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const injectRuntimeBundle = React.useCallback(() => {
    const target = webViewRef.current;
    if (!target || runtimeInjectedRef.current) {
      return;
    }

    runtimeInjectedRef.current = true;
    const ticket = runtimeLoadTicketRef.current + 1;
    runtimeLoadTicketRef.current = ticket;
    let chunkIndex = 0;

    const postNextChunk = () => {
      if (runtimeLoadTicketRef.current !== ticket) {
        return;
      }

      const activeTarget = webViewRef.current;
      if (!activeTarget) {
        return;
      }

      if (chunkIndex < runtimeChunks.length) {
        activeTarget.postMessage(
          JSON.stringify({
            channel: LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL,
            chunk: runtimeChunks[chunkIndex],
            index: chunkIndex,
            type: 'runtimeChunk',
          })
        );
        chunkIndex += 1;
        setTimeout(postNextChunk, 0);
        return;
      }

      activeTarget.postMessage(
        JSON.stringify({
          channel: LEARNING_PDF_READER_RUNTIME_LOADER_CHANNEL,
          type: 'runtimeExecute',
        })
      );
    };

    postNextChunk();
  }, [runtimeChunks]);

  React.useEffect(() => {
    runtimeLoadTicketRef.current += 1;
    loaderInjectedRef.current = false;
    runtimeInjectedRef.current = false;
    setIsReady(false);
  }, [loaderScript]);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    postRuntimeMessage({
      annotations: readerState.annotations,
      type: 'hydrateAnnotations',
    });
  }, [isReady, postRuntimeMessage, readerState.annotations]);

  React.useEffect(() => {
    if (!isReady || !command) {
      return;
    }

    postRuntimeMessage(command);
  }, [command, isReady, postRuntimeMessage]);

  const handleMessage = React.useCallback(
    (event: { nativeEvent: { data?: string } }) => {
      const payload = event.nativeEvent.data;
      if (!payload) {
        return;
      }

      let rawMessage: Record<string, unknown> | null = null;
      try {
        rawMessage = JSON.parse(payload) as Record<string, unknown>;
      } catch {
        rawMessage = null;
      }

      if (!rawMessage) {
        return;
      }

      if (rawMessage.type === 'loaderReady') {
        injectRuntimeBundle();
        return;
      }

      const message = rawMessage as LearningPdfReaderRuntimeOutputMessage;

      if (message.type === 'ready') {
        setIsReady(true);
        return;
      }

      if (message.type === 'documentLoaded') {
        onDocumentLoaded({
          pageCount: message.pageCount,
          title: message.title,
        });
        return;
      }

      if (message.type === 'outlineLoaded') {
        onOutlineLoaded(message.outline);
        return;
      }

      if (message.type === 'pageChanged') {
        onPageChanged({
          pageNumber: message.pageNumber,
          scale: message.scale,
        });
        return;
      }

      if (message.type === 'selectionChanged') {
        onSelectionChanged(message);
        return;
      }

      if (message.type === 'pageTap') {
        onPageTap(message);
        return;
      }

      if (message.type === 'searchResultChanged') {
        onSearchResultChanged(message);
        return;
      }

      if (message.type === 'runtimeError') {
        onRuntimeError(message.message);
      }
    },
    [
      injectRuntimeBundle,
      onDocumentLoaded,
      onOutlineLoaded,
      onPageChanged,
      onPageTap,
      onRuntimeError,
      onSearchResultChanged,
      onSelectionChanged,
    ]
  );

  if (!WebView) {
    return (
      <LearningPdfReaderWebViewUnavailable
        body="当前运行的开发包还没有包含 WebView 原生模块。重新构建 iOS/Android 开发包后，PDF 交互阅读器才能正常打开。"
        title="需要重新构建 App"
      />
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        allowsBackForwardNavigationGestures={false}
        allowsInlineMediaPlayback
        bounces={false}
        javaScriptEnabled
        onContentProcessDidTerminate={() =>
          onDocumentLoadFailed('WKWebView content process terminated')
        }
        onError={(event: {
          nativeEvent?: { code?: number; description?: string; domain?: string };
        }) => {
          const description =
            event.nativeEvent?.description?.trim() || 'WKWebView failed to load HTML runtime';
          const domain = event.nativeEvent?.domain?.trim();
          const code = event.nativeEvent?.code;
          const detail =
            domain || typeof code === 'number'
              ? `${description} (${domain || 'unknown-domain'}${typeof code === 'number' ? `/${code}` : ''})`
              : description;

          onDocumentLoadFailed(detail);
        }}
        onLoadEnd={() => {
          if (!loaderInjectedRef.current) {
            loaderInjectedRef.current = true;
            webViewRef.current?.injectJavaScript(loaderScript);
          }
        }}
        onMessage={handleMessage}
        originWhitelist={['*']}
        overScrollMode="never"
        ref={webViewRef}
        scrollEnabled={false}
        source={{
          baseUrl: documentUrl,
          html: runtimeHtml,
        }}
        style={styles.webView}
        testID="learning-pdf-reader-webview"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  unavailableState: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  webView: {
    backgroundColor: 'transparent',
    flex: 1,
  },
});
