import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type {
  LearningGraphHydratePayload,
  LearningGraphRuntimeInputMessage,
  LearningGraphRuntimeOutputMessage,
} from '@/lib/learning/graph-bridge';
import { buildLearningGraphRuntimeHtml } from '@/lib/learning/graph-runtime';

import { learningGraphRuntimeBundle } from '@/components/learning/learning-graph-runtime.generated';
import { useAppTheme } from '@/hooks/use-app-theme';

type LearningGraphWebViewProps = {
  hydratePayload: LearningGraphHydratePayload;
  hydrateToken: number;
  onBackgroundTap: () => void;
  onNodeTap: (nodeId: string) => void;
  selectedNodeId: string | null;
};

type WebViewComponent = React.ComponentType<Record<string, unknown>>;

export function resolveLearningGraphWebViewModule(
  loader: () => { WebView?: WebViewComponent }
): WebViewComponent | null {
  try {
    return loader().WebView ?? null;
  } catch {
    return null;
  }
}

export function LearningGraphWebViewUnavailable({
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

export function LearningGraphWebView({
  hydratePayload,
  hydrateToken,
  onBackgroundTap,
  onNodeTap,
  selectedNodeId,
}: LearningGraphWebViewProps) {
  const WebView = React.useMemo(
    () => resolveLearningGraphWebViewModule(() => require('react-native-webview')),
    []
  );
  const webViewRef = React.useRef<any>(null);
  const [isReady, setIsReady] = React.useState(false);
  const initialHydratePayloadRef = React.useRef<LearningGraphHydratePayload>({
    ...hydratePayload,
    selectedNodeId,
  });
  const html = React.useMemo(
    () =>
      buildLearningGraphRuntimeHtml(
        learningGraphRuntimeBundle,
        initialHydratePayloadRef.current
      ),
    []
  );

  if (!WebView) {
    return (
      <LearningGraphWebViewUnavailable
        body="当前运行的开发包还没有包含 WebView 原生模块。重新构建 iOS/Android 开发包后，图谱页就能正常打开。"
        title="需要重新构建 App"
      />
    );
  }

  const postRuntimeMessage = React.useCallback((message: LearningGraphRuntimeInputMessage) => {
    webViewRef.current?.postMessage(JSON.stringify(message));
  }, []);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    postRuntimeMessage({
      payload: {
        ...hydratePayload,
        selectedNodeId,
      },
      type: 'hydrate',
    });
  }, [hydratePayload, hydrateToken, isReady, postRuntimeMessage, selectedNodeId]);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!selectedNodeId) {
      postRuntimeMessage({ type: 'clearSelection' });
      return;
    }

    postRuntimeMessage({
      nodeId: selectedNodeId,
      type: 'focusNode',
    });
  }, [isReady, postRuntimeMessage, selectedNodeId]);

  const handleMessage = React.useCallback(
    (event: { nativeEvent: { data?: string } }) => {
      const payload = event.nativeEvent.data;
      if (!payload) {
        return;
      }

      let message: LearningGraphRuntimeOutputMessage | null = null;
      try {
        message = JSON.parse(payload) as LearningGraphRuntimeOutputMessage;
      } catch {
        message = null;
      }

      if (!message) {
        return;
      }

      if (message.type === 'ready') {
        setIsReady(true);
        return;
      }

      if (message.type === 'backgroundTap') {
        onBackgroundTap();
        return;
      }

      if (message.type === 'status') {
        return;
      }

      if (message.type === 'runtimeError') {
        return;
      }

      if (message.type === 'nodeTap') {
        onNodeTap(message.nodeId);
      }
    },
    [onBackgroundTap, onNodeTap]
  );

  return (
    <View style={styles.container}>
      <WebView
        bounces={false}
        javaScriptEnabled
        onContentProcessDidTerminate={() => undefined}
        onError={(_event: { nativeEvent?: { description?: string } }) => undefined}
        onMessage={handleMessage}
        originWhitelist={['*']}
        overScrollMode="never"
        ref={webViewRef}
        scrollEnabled={false}
        source={{ html }}
        style={styles.webView}
        testID="learning-graph-webview"
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
